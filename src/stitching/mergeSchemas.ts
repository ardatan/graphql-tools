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
  IResolvers,
  MergeInfo,
  OnTypeConflict,
  IResolversParameter,
  SchemaExecutionConfig,
  isSchemaExecutionConfig,
  isRemoteSchemaExecutionConfig,
} from '../Interfaces';
import {
  extractExtensionDefinitions,
  addResolveFunctionsToSchema,
} from '../makeExecutableSchema';
import delegateToSchema from './delegateToSchema';
import delegateToRemoteSchema from './delegateToRemoteSchema';
import typeFromAST from './typeFromAST';
import {
  Transform,
  ExpandAbstractTypes,
  ReplaceFieldWithFragment,
} from '../transforms';
import mergeDeep from '../utils/mergeDeep';
import { SchemaDirectiveVisitor, healSchema } from '../schemaVisitor';
import { cloneDirective, cloneType, healTypes } from '../utils';
import { makeMergedType } from './makeMergedType';

type MergeTypeCandidate = {
  schema?: GraphQLSchema;
  executionConfig?: SchemaExecutionConfig;
  type: GraphQLNamedType;
};

type MergeTypeCandidatesResult = {
  type?: GraphQLNamedType;
  resolvers?: IResolvers;
  candidate?: MergeTypeCandidate;
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
  schemas: Array<
    string | GraphQLSchema | SchemaExecutionConfig | DocumentNode | Array<GraphQLNamedType>
  >;
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

  schemas.forEach(schemaOrSchemaExecutionConfig => {
    let schema: string | GraphQLSchema | SchemaExecutionConfig | DocumentNode | Array<GraphQLNamedType>;
    let executionConfig: SchemaExecutionConfig;
    if (isSchemaExecutionConfig(schemaOrSchemaExecutionConfig)) {
      executionConfig  = schemaOrSchemaExecutionConfig;
      schema = schemaOrSchemaExecutionConfig.schema;
    } else {
      schema = schemaOrSchemaExecutionConfig;
    }

    if (schema instanceof GraphQLSchema) {
      allSchemas.push(schema);
      const queryType = schema.getQueryType();
      const mutationType = schema.getMutationType();
      const subscriptionType = schema.getSubscriptionType();
      if (queryType) {
        addTypeCandidate(typeCandidates, 'Query', {
          schema,
          executionConfig,
          type: queryType,
        });
      }
      if (mutationType) {
        addTypeCandidate(typeCandidates, 'Mutation', {
          schema,
          executionConfig,
          type: mutationType,
        });
      }
      if (subscriptionType) {
        addTypeCandidate(typeCandidates, 'Subscription', {
          schema,
          executionConfig,
          type: subscriptionType,
        });
      }

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
          type !== queryType &&
          type !== mutationType &&
          type !== subscriptionType
        ) {
          addTypeCandidate(typeCandidates, type.name, {
            schema: schema as GraphQLSchema,
            executionConfig,
            type,
          });
        }
      });
    } else if (
      typeof schema === 'string' ||
      (schema && (schema as DocumentNode).kind === Kind.DOCUMENT)
    ) {
      let parsedSchemaDocument =
      typeof schema === 'string' ? parse(schema) : (schema as DocumentNode);
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
    } else if (Array.isArray(schema)) {
      schema.forEach(type => {
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

  let generatedResolvers = {};

  Object.keys(typeCandidates).forEach(typeName => {
    const mergeResult: MergeTypeCandidatesResult = mergeTypeCandidates(
      typeName,
      typeCandidates[typeName],
      onTypeConflict ? onTypeConflictToCandidateSelector(onTypeConflict) : undefined
    );
    let type: GraphQLNamedType;
    let typeResolvers: IResolvers;
    if (mergeResult.type) {
      type = mergeResult.type;
      typeResolvers = mergeResult.resolvers;
    } else {
      throw new Error(`Invalid mergeTypeCandidates result for type ${typeName}`);
    }
    types[typeName] = type;
    if (typeResolvers !== undefined) {
      generatedResolvers[typeName] = typeResolvers;
    }
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
    resolvers: mergeDeep(generatedResolvers, resolvers),
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
    let rootObject: GraphQLObjectType;
    if (operation === 'subscription') {
      rootObject = schema.getSubscriptionType();
    } else if (operation === 'mutation') {
      rootObject = schema.getMutationType();
    } else {
      rootObject = schema.getQueryType();
    }
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
  executionConfig,
  operation,
  fieldName,
}: {
  schema: GraphQLSchema,
  executionConfig?: SchemaExecutionConfig,
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
}): IFieldResolver<any, any> {
  if (executionConfig && isRemoteSchemaExecutionConfig(executionConfig)) {
    return (root, args, context, info) => {
      return delegateToRemoteSchema({
        ...executionConfig,
        operation,
        fieldName,
        args,
        context,
        info,
      });
    };
  }

  return (root, args, context, info) => {
    return info.mergeInfo.delegateToSchema({
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

function mergeTypeCandidates(
  name: string,
  candidates: Array<MergeTypeCandidate>,
  candidateSelector?: CandidateSelector
): MergeTypeCandidatesResult {
  if (!candidateSelector) {
    candidateSelector = cands => cands[cands.length - 1];
  }
  if (name === 'Query' || name === 'Mutation' || name === 'Subscription') {
    let fields = {};
    let operationName: 'query' | 'mutation' | 'subscription';
    switch (name) {
      case 'Query':
        operationName = 'query';
        break;
      case 'Mutation':
        operationName = 'mutation';
        break;
      case 'Subscription':
        operationName = 'subscription';
        break;
      default:
        break;
    }
    const resolvers = {};
    const resolverKey =
      operationName === 'subscription' ? 'subscribe' : 'resolve';
    candidates.forEach(({ type: candidateType, schema, executionConfig }) => {
      const candidateFields = (candidateType as GraphQLObjectType).toConfig().fields;
      fields = { ...fields, ...candidateFields };
      Object.keys(candidateFields).forEach(fieldName => {
        resolvers[fieldName] = {
          [resolverKey]: schema ? createDelegatingResolver({
            schema,
            executionConfig,
            operation: operationName,
            fieldName,
          }) : null,
        };
      });
    });
    const type = new GraphQLObjectType({
      name,
      fields,
    });
    return {
      type,
      resolvers,
    };
  } else {
    const candidate = candidateSelector(candidates);
    const type = cloneType(candidate.type);
    makeMergedType(type);
    return {
      type,
      candidate
    };
  }
}
