import {
  DocumentNode,
  GraphQLField,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
  extendSchema,
  getNamedType,
  isNamedType,
  parse,
  Kind,
  GraphQLDirective,
} from 'graphql';
import {
  IDelegateToSchemaOptions,
  IFieldResolver,
  MergeInfo,
  OnTypeConflict,
  IResolversParameter,
  SchemaExecutionConfig,
  isSchemaExecutionConfig,
  SchemaLikeObject,
  GraphQLSchemaWithTransforms,
  IResolvers,
} from '../Interfaces';
import {
  extractExtensionDefinitions,
  addResolveFunctionsToSchema,
} from '../makeExecutableSchema';
import delegateToSchema from './delegateToSchema';
import typeFromAST from './typeFromAST';
import {
  Transform,
  ExpandAbstractTypes,
  ReplaceFieldWithFragment,
} from '../transforms';
import mergeDeep from '../utils/mergeDeep';
import { SchemaDirectiveVisitor } from '../utils/SchemaDirectiveVisitor';
import { cloneDirective, cloneType } from '../utils/clone';
import { healSchema, healTypes } from '../utils/heal';
import { makeMergedType } from './makeMergedType';

type MergeTypeCandidate = {
  schema?: GraphQLSchema;
  executionConfig?: SchemaExecutionConfig;
  type: GraphQLNamedType;
};

type CandidateSelector = (
  candidates: Array<MergeTypeCandidate>,
) => MergeTypeCandidate;

export default function mergeSchemas({
  schemas,
  onTypeConflict,
  resolvers,
  schemaDirectives,
  inheritResolversFromInterfaces,
  mergeDirectives,
}: {
  schemas: Array<SchemaLikeObject>;
  onTypeConflict?: OnTypeConflict;
  resolvers?: IResolversParameter;
  schemaDirectives?: { [name: string]: typeof SchemaDirectiveVisitor };
  inheritResolversFromInterfaces?: boolean;
  mergeDirectives?: boolean,
}): GraphQLSchema {
  const allSchemas: Array<GraphQLSchema> = [];
  const typeCandidates: { [name: string]: Array<MergeTypeCandidate> } = {};
  const types: { [name: string]: GraphQLNamedType } = {};
  const extensions: Array<DocumentNode> = [];
  const directives: Array<GraphQLDirective> = [];
  const fragments: Array<{
    field: string;
    fragment: string;
  }> = [];

  schemas.forEach(schemaLikeObject => {
    if (schemaLikeObject instanceof GraphQLSchema || isSchemaExecutionConfig(schemaLikeObject)) {
      let schema: GraphQLSchemaWithTransforms;
      let executionConfig: SchemaExecutionConfig;
      if (isSchemaExecutionConfig(schemaLikeObject)) {
        executionConfig = schemaLikeObject;
        schema = schemaLikeObject.schema;
      } else {
        schema = schemaLikeObject;
      }

      allSchemas.push(schema);

      const operationTypes = {
        Query: schema.getQueryType(),
        Mutation: schema.getMutationType(),
        Subscription: schema.getSubscriptionType(),
      };

      Object.keys(operationTypes).forEach(typeName => {
        if (operationTypes[typeName]) {
          addTypeCandidate(typeCandidates, typeName, {
            schema,
            executionConfig,
            type: operationTypes[typeName],
          });
        }
      });

      if (mergeDirectives) {
        const directiveInstances = schema.getDirectives();
        directiveInstances.forEach(directive => {
          directives.push(directive);
        });
      }

      const typeMap = schema.getTypeMap();
      Object.keys(typeMap).forEach(typeName => {
        const type: GraphQLNamedType = typeMap[typeName];
        if (
          isNamedType(type) &&
          getNamedType(type).name.slice(0, 2) !== '__' &&
          type !== operationTypes.Query &&
          type !== operationTypes.Mutation &&
          type !== operationTypes.Subscription
        ) {
          addTypeCandidate(typeCandidates, type.name, {
            schema,
            executionConfig,
            type,
          });
        }
      });
    } else if (
      typeof schemaLikeObject === 'string' ||
      (schemaLikeObject && (schemaLikeObject as DocumentNode).kind === Kind.DOCUMENT)
    ) {
      let parsedSchemaDocument =
      typeof schemaLikeObject === 'string' ? parse(schemaLikeObject) : (schemaLikeObject as DocumentNode);
      parsedSchemaDocument.definitions.forEach(def => {
        const type = typeFromAST(def);
        if (type instanceof GraphQLDirective && mergeDirectives) {
          directives.push(type);
        } else if (type && !(type instanceof GraphQLDirective)) {
          addTypeCandidate(typeCandidates, type.name, {
            type,
          });
        }
      });

      const extensionsDocument = extractExtensionDefinitions(
        parsedSchemaDocument,
      );
      if (extensionsDocument.definitions.length > 0) {
        extensions.push(extensionsDocument);
      }
    } else if (Array.isArray(schemaLikeObject)) {
      schemaLikeObject.forEach(type => {
        addTypeCandidate(typeCandidates, type.name, {
          type,
        });
      });
    } else {
      throw new Error(`Invalid schema passed`);
    }
  });

  const mergeInfo = createMergeInfo(allSchemas, fragments);

  if (!resolvers) {
    resolvers = {};
  } else if (typeof resolvers === 'function') {
    console.warn(
      'Passing functions as resolver parameter is deprecated. Use `info.mergeInfo` instead.',
    );
    resolvers = resolvers(mergeInfo);
  } else if (Array.isArray(resolvers)) {
    resolvers = resolvers.reduce((left, right) => {
      if (typeof right === 'function') {
        console.warn(
          'Passing functions as resolver parameter is deprecated. Use `info.mergeInfo` instead.',
        );
        right = right(mergeInfo);
      }
      return mergeDeep(left, right);
    }, {});
  }

  Object.keys(typeCandidates).forEach(typeName => {
    const mergeResult = mergeTypeCandidates(
      typeName,
      typeCandidates[typeName],
      onTypeConflict ? onTypeConflictToCandidateSelector(onTypeConflict) : undefined
    );
    types[typeName] = mergeResult;
  });

  healTypes(types, directives, { skipPruning: true });

  let mergedSchema = new GraphQLSchema({
    query: types.Query as GraphQLObjectType,
    mutation: types.Mutation as GraphQLObjectType,
    subscription: types.Subscription as GraphQLObjectType,
    types: Object.keys(types).map(key => types[key]),
    directives: directives.length ?
      directives.map((directive) => cloneDirective(directive)) :
      undefined
  });

  extensions.forEach(extension => {
    mergedSchema = (extendSchema as any)(mergedSchema, extension, {
      commentDescriptions: true,
    });
  });

  if (!resolvers) {
    resolvers = {};
  } else if (Array.isArray(resolvers)) {
    resolvers = resolvers.reduce(mergeDeep, {});
  }

  Object.keys(resolvers).forEach(typeName => {
    const type = resolvers[typeName];
    if (type instanceof GraphQLScalarType) {
      return;
    }
    Object.keys(type).forEach(fieldName => {
      const field = type[fieldName];
      if (field.fragment) {
        fragments.push({
          field: fieldName,
          fragment: field.fragment,
        });
      }
    });
  });

  addResolveFunctionsToSchema({
    schema: mergedSchema,
    resolvers: resolvers as IResolvers,
    inheritResolversFromInterfaces
  });

  forEachField(mergedSchema, field => {
    if (field.resolve) {
      const fieldResolver = field.resolve;
      field.resolve = (parent, args, context, info) => {
        const newInfo = { ...info, mergeInfo };
        return fieldResolver(parent, args, context, newInfo);
      };
    }
    if (field.subscribe) {
      const fieldResolver = field.subscribe;
      field.subscribe = (parent, args, context, info) => {
        const newInfo = { ...info, mergeInfo };
        return fieldResolver(parent, args, context, newInfo);
      };
    }
  });

  if (schemaDirectives) {
    SchemaDirectiveVisitor.visitSchemaDirectives(
      mergedSchema,
      schemaDirectives,
    );
  }

  healSchema(mergedSchema);

  return mergedSchema;
}

function createMergeInfo(
  allSchemas: Array<GraphQLSchema>,
  fragments: Array<{
    field: string;
    fragment: string;
  }>,
): MergeInfo {
  return {
    delegate(
      operation: 'query' | 'mutation' | 'subscription',
      fieldName: string,
      args: { [key: string]: any },
      context: { [key: string]: any },
      info: GraphQLResolveInfo,
      transforms?: Array<Transform>,
    ) {
      console.warn(
        '`mergeInfo.delegate` is deprecated. ' +
          'Use `mergeInfo.delegateToSchema and pass explicit schema instances.',
      );
      const schema = guessSchemaByRootField(allSchemas, operation, fieldName);
      const expandTransforms = new ExpandAbstractTypes(info.schema, schema);
      const fragmentTransform = new ReplaceFieldWithFragment(schema, fragments);
      return delegateToSchema({
        schema,
        operation,
        fieldName,
        args,
        context,
        info,
        transforms: [
          ...(transforms || []),
          expandTransforms,
          fragmentTransform,
        ],
      });
    },

    delegateToSchema(options: IDelegateToSchemaOptions) {
      return delegateToSchema({
        ...options,
        transforms: options.transforms
      });
    },
    fragments
  };
}

function guessSchemaByRootField(
  schemas: Array<GraphQLSchema>,
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
): GraphQLSchema {
  for (const schema of schemas) {
    let rootObject = operationToRootType(operation, schema);
    if (rootObject) {
      const fields = rootObject.getFields();
      if (fields[fieldName]) {
        return schema;
      }
    }
  }
  throw new Error(
    `Could not find subschema with field \`${operation}.${fieldName}\``,
  );
}

function createDelegatingResolver({
  schema,
  operation,
  fieldName,
}: {
  schema: GraphQLSchema | SchemaExecutionConfig,
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
}): IFieldResolver<any, any> {
  return (root, args, context, info) => {
    return delegateToSchema({
      schema,
      operation,
      fieldName,
      args,
      context,
      info,
    });
  };
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

function addTypeCandidate(
  typeCandidates: { [name: string]: Array<MergeTypeCandidate> },
  name: string,
  typeCandidate: MergeTypeCandidate,
) {
  if (!typeCandidates[name]) {
    typeCandidates[name] = [];
  }
  typeCandidates[name].push(typeCandidate);
}

function onTypeConflictToCandidateSelector(onTypeConflict: OnTypeConflict): CandidateSelector {
  return cands =>
    cands.reduce((prev, next) => {
      const type = onTypeConflict(prev.type, next.type, {
        left: {
          schema: prev.schema,
        },
        right: {
          schema: next.schema,
        },
      });
      if (prev.type === type) {
        return prev;
      } else if (next.type === type) {
        return next;
      } else {
        return {
          schemaName: 'unknown',
          type
        };
      }
    });
}


function rootTypeNameToOperation(
  name: 'Query' | 'Mutation' | 'Subscription'
): 'query' | 'mutation' | 'subscription' {
  return name.toLowerCase() as 'query' | 'mutation' | 'subscription';
}

function operationToRootType(
  operation: 'query' | 'mutation' | 'subscription',
  schema: GraphQLSchema,
): GraphQLObjectType {
  if (operation === 'subscription') {
    return schema.getSubscriptionType();
  } else if (operation === 'mutation') {
    return schema.getMutationType();
  } else {
    return schema.getQueryType();
  }
}

function mergeTypeCandidates(
  name: string,
  candidates: Array<MergeTypeCandidate>,
  candidateSelector?: CandidateSelector
): GraphQLNamedType {
  if (!candidateSelector) {
    candidateSelector = cands => cands[cands.length - 1];
  }
  if (name === 'Query' || name === 'Mutation' || name === 'Subscription') {
    return mergeRootTypeCandidates(name, candidates);
  } else {
    const candidate = candidateSelector(candidates);
    const type = cloneType(candidate.type);
    makeMergedType(type);
    return type;
  }
}

function mergeRootTypeCandidates(
  name: 'Query' | 'Mutation' | 'Subscription',
  candidates: Array<MergeTypeCandidate>
): GraphQLNamedType {
  let operation = rootTypeNameToOperation(name);
  let fields = {};
  const resolverKey = operation === 'subscription' ? 'subscribe' : 'resolve';
  candidates.forEach(candidate => {
    const { type: candidateType, schema, executionConfig } = candidate;
    const candidateFields = (candidateType as GraphQLObjectType).toConfig().fields;
    Object.keys(candidateFields).forEach(fieldName => {
      candidateFields[fieldName][resolverKey] =
        schema ? createDelegatingResolver({
          schema: executionConfig ? executionConfig : schema,
          operation,
          fieldName,
        }) : null;
    });
    fields = { ...fields, ...candidateFields };
  });
  return new GraphQLObjectType({
    name,
    fields,
  });
}
