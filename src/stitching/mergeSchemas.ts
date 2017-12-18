import {
  DocumentNode,
  GraphQLField,
  GraphQLFieldMap,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  buildASTSchema,
  extendSchema,
  getNamedType,
  isCompositeType,
  isNamedType,
  parse,
} from 'graphql';
import TypeRegistry from './TypeRegistry';
import { IResolvers, MergeInfo, IFieldResolver } from '../Interfaces';
import isEmptyObject from '../isEmptyObject';
import {
  extractExtensionDefinitions,
  addResolveFunctionsToSchema,
} from '../schemaGenerator';
import {
  recreateCompositeType,
  fieldMapToFieldConfigMap,
} from './schemaRecreation';
import delegateToSchema from './delegateToSchema';
import typeFromAST from './typeFromAST';

const backcompatOptions = { commentDescriptions: true };

export default function mergeSchemas({
  schemas,
  onTypeConflict,
  resolvers,
}: {
  schemas: Array<GraphQLSchema | string>;
  onTypeConflict?: (
    left: GraphQLNamedType,
    right: GraphQLNamedType,
  ) => GraphQLNamedType;
  resolvers?: IResolvers | ((mergeInfo: MergeInfo) => IResolvers);
}): GraphQLSchema {
  if (!onTypeConflict) {
    onTypeConflict = defaultOnTypeConflict;
  }
  let queryFields: GraphQLFieldMap<any, any> = {};
  let mutationFields: GraphQLFieldMap<any, any> = {};
  let subscriptionFields: GraphQLFieldMap<any, any> = {};

  const typeRegistry = new TypeRegistry();

  const mergeInfo: MergeInfo = createMergeInfo(typeRegistry);

  const actualSchemas: Array<GraphQLSchema> = [];
  const typeFragments: Array<DocumentNode> = [];
  const extensions: Array<DocumentNode> = [];
  let fullResolvers: IResolvers = {};

  schemas.forEach(schema => {
    if (schema instanceof GraphQLSchema) {
      actualSchemas.push(schema);
    } else if (typeof schema === 'string') {
      let parsedSchemaDocument = parse(schema);
      try {
        // TODO fix types https://github.com/apollographql/graphql-tools/issues/542
        const actualSchema = (buildASTSchema as any)(
          parsedSchemaDocument,
          backcompatOptions,
        );
        actualSchemas.push(actualSchema);
      } catch (e) {
        typeFragments.push(parsedSchemaDocument);
      }
      parsedSchemaDocument = extractExtensionDefinitions(parsedSchemaDocument);
      if (parsedSchemaDocument.definitions.length > 0) {
        extensions.push(parsedSchemaDocument);
      }
    }
  });

  actualSchemas.forEach(schema => {
    typeRegistry.addSchema(schema);
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const subscriptionType = schema.getSubscriptionType();

    const typeMap = schema.getTypeMap();
    Object.keys(typeMap).forEach(typeName => {
      const type: GraphQLType = typeMap[typeName];
      if (
        isNamedType(type) &&
        getNamedType(type).name.slice(0, 2) !== '__' &&
        type !== queryType &&
        type !== mutationType &&
        type !== subscriptionType
      ) {
        let newType;
        if (isCompositeType(type) || type instanceof GraphQLInputObjectType) {
          newType = recreateCompositeType(schema, type, typeRegistry);
        } else {
          newType = getNamedType(type);
        }
        if (newType instanceof GraphQLObjectType) {
          delete newType.isTypeOf;
        }
        typeRegistry.addType(newType.name, newType, onTypeConflict);
      }
    });

    Object.keys(queryType.getFields()).forEach(name => {
      if (!fullResolvers.Query) {
        fullResolvers.Query = {};
      }
      fullResolvers.Query[name] = createDelegatingResolver(
        mergeInfo,
        'query',
        name,
      );
    });

    queryFields = {
      ...queryFields,
      ...queryType.getFields(),
    };

    if (mutationType) {
      if (!fullResolvers.Mutation) {
        fullResolvers.Mutation = {};
      }
      Object.keys(mutationType.getFields()).forEach(name => {
        fullResolvers.Mutation[name] = createDelegatingResolver(
          mergeInfo,
          'mutation',
          name,
        );
      });

      mutationFields = {
        ...mutationFields,
        ...mutationType.getFields(),
      };
    }

    if (subscriptionType) {
      if (!fullResolvers.Subscription) {
        fullResolvers.Subscription = {};
      }
      Object.keys(subscriptionType.getFields()).forEach(name => {
        fullResolvers.Subscription[name] = {
          subscribe: createDelegatingResolver(mergeInfo, 'subscription', name),
        };
      });

      subscriptionFields = {
        ...subscriptionFields,
        ...subscriptionType.getFields(),
      };
    }
  });

  typeFragments.forEach(document => {
    document.definitions.forEach(def => {
      const type = typeFromAST(typeRegistry, def);
      if (type) {
        typeRegistry.addType(type.name, type, onTypeConflict);
      }
    });
  });

  let passedResolvers = {};
  if (resolvers) {
    if (typeof resolvers === 'function') {
      passedResolvers = resolvers(mergeInfo);
    } else {
      passedResolvers = { ...resolvers };
    }
  }

  Object.keys(passedResolvers).forEach(typeName => {
    const type = passedResolvers[typeName];
    if (type instanceof GraphQLScalarType) {
      return;
    }
    Object.keys(type).forEach(fieldName => {
      const field = type[fieldName];
      if (field.fragment) {
        typeRegistry.addFragment(typeName, fieldName, field.fragment);
      }
    });
  });

  fullResolvers = mergeDeep(fullResolvers, passedResolvers);

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: () => fieldMapToFieldConfigMap(queryFields, typeRegistry),
  });

  let mutation;
  if (!isEmptyObject(mutationFields)) {
    mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: () => fieldMapToFieldConfigMap(mutationFields, typeRegistry),
    });
  }

  let subscription;
  if (!isEmptyObject(subscriptionFields)) {
    subscription = new GraphQLObjectType({
      name: 'Subscription',
      fields: () => fieldMapToFieldConfigMap(subscriptionFields, typeRegistry),
    });
  }

  typeRegistry.addType('Query', query);
  typeRegistry.addType('Mutation', mutation);
  typeRegistry.addType('Subscription', subscription);

  let mergedSchema = new GraphQLSchema({
    query,
    mutation,
    subscription,
    types: typeRegistry.getAllTypes(),
  });

  extensions.forEach(extension => {
    // TODO fix types https://github.com/apollographql/graphql-tools/issues/542
    mergedSchema = (extendSchema as any)(
      mergedSchema,
      extension,
      backcompatOptions,
    );
  });

  addResolveFunctionsToSchema(mergedSchema, fullResolvers);

  forEachField(mergedSchema, field => {
    if (field.resolve) {
      const fieldResolver = field.resolve;
      field.resolve = (parent, args, context, info) => {
        const newInfo = { ...info, mergeInfo };
        return fieldResolver(parent, args, context, newInfo);
      };
    }
  });

  return mergedSchema;
}

function defaultOnTypeConflict(
  left: GraphQLNamedType,
  right: GraphQLNamedType,
): GraphQLNamedType {
  return left;
}

function createMergeInfo(typeRegistry: TypeRegistry): MergeInfo {
  return {
    delegate(
      operation: 'query' | 'mutation' | 'subscription',
      fieldName: string,
      args: { [key: string]: any },
      context: { [key: string]: any },
      info: GraphQLResolveInfo,
    ): any {
      const schema = typeRegistry.getSchemaByField(operation, fieldName);
      if (!schema) {
        throw new Error(
          `Cannot find subschema for root field ${operation}.${fieldName}`,
        );
      }
      const fragmentReplacements = typeRegistry.fragmentReplacements;
      return delegateToSchema(
        schema,
        fragmentReplacements,
        operation,
        fieldName,
        args,
        context,
        info,
      );
    },
  };
}

function createDelegatingResolver(
  mergeInfo: MergeInfo,
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
): IFieldResolver<any, any> {
  return (root, args, context, info) => {
    return mergeInfo.delegate(operation, fieldName, args, context, info);
  };
}

function isObject(item: any): Boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target: any, source: any): any {
  let output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

type FieldIteratorFn = (
  fieldDef: GraphQLField<any, any>,
  typeName: string,
  fieldName: string,
) => void;

function forEachField(schema: GraphQLSchema, fn: FieldIteratorFn): void {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];

    if (
      !getNamedType(type).name.startsWith('__') &&
      type instanceof GraphQLObjectType
    ) {
      const fields = type.getFields();
      Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}
