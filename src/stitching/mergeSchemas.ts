import {
  DocumentNode,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  InlineFragmentNode,
  Kind,
  extendSchema,
  getNamedType,
  isNamedType,
  parse,
} from 'graphql';
import {
  IResolvers,
  MergeInfo,
  IFieldResolver,
  VisitType,
  MergeTypeCandidate,
  TypeWithResolvers,
  VisitTypeResult,
  IDelegateToSchemaOptions,
} from '../Interfaces';
import {
  extractExtensionDefinitions,
  addResolveFunctionsToSchema,
} from '../schemaGenerator';
import {
  recreateType,
  fieldMapToFieldConfigMap,
  createResolveType,
} from './schemaRecreation';
import delegateToSchema from './delegateToSchema';
import typeFromAST, { GetType } from './typeFromAST';
import { Transform, Transforms } from '../transforms';
import mergeDeep from '../mergeDeep';

export type OnTypeConflict = (
  left: GraphQLNamedType,
  right: GraphQLNamedType,
  info?: {
    left: {
      schema?: GraphQLSchema;
    };
    right: {
      schema?: GraphQLSchema;
    };
  },
) => GraphQLNamedType;

export default function mergeSchemas({
  schemas,
  onTypeConflict,
  resolvers,
}: {
  schemas: Array<string | GraphQLSchema | Array<GraphQLNamedType>>;
  onTypeConflict?: OnTypeConflict;
  resolvers?:
    | Array<IResolvers | ((mergeInfo: MergeInfo) => IResolvers)>
    | IResolvers
    | ((mergeInfo: MergeInfo) => IResolvers);
}): GraphQLSchema {
  let visitType: VisitType = defaultVisitType;
  if (onTypeConflict) {
    console.warn(
      '`onTypeConflict` is deprecated. Use schema transforms to customize merging logic.',
    );
    visitType = createVisitTypeFromOnTypeConflict(onTypeConflict);
  }
  return mergeSchemasImplementation({ schemas, visitType, resolvers });
}

function mergeSchemasImplementation({
  schemas,
  visitType,
  resolvers,
}: {
  schemas: Array<string | GraphQLSchema | Array<GraphQLNamedType>>;
  visitType?: VisitType;
  resolvers?:
    | Array<IResolvers | ((mergeInfo: MergeInfo) => IResolvers)>
    | IResolvers
    | ((mergeInfo: MergeInfo) => IResolvers);
}): GraphQLSchema {
  const allSchemas: Array<GraphQLSchema> = [];
  const typeCandidates: { [name: string]: Array<MergeTypeCandidate> } = {};
  const types: { [name: string]: GraphQLNamedType } = {};
  const extensions: Array<DocumentNode> = [];
  const fragments = {};

  if (!visitType) {
    visitType = defaultVisitType;
  }

  const resolveType = createResolveType(name => {
    if (types[name] === undefined) {
      throw new Error(`Can't find type ${name}.`);
    }
    return types[name];
  });

  const createNamedStub: GetType = (name, type) => {
    let constructor: any;
    if (type === 'object') {
      constructor = GraphQLObjectType;
    } else if (type === 'interface') {
      constructor = GraphQLInterfaceType;
    } else {
      constructor = GraphQLInputObjectType;
    }
    return new constructor({
      name,
      fields: {
        __fake: {
          type: GraphQLString,
        },
      },
    });
  };

  schemas.forEach(schema => {
    if (schema instanceof GraphQLSchema) {
      allSchemas.push(schema);
      const queryType = schema.getQueryType();
      const mutationType = schema.getMutationType();
      const subscriptionType = schema.getSubscriptionType();
      if (queryType) {
        addTypeCandidate(typeCandidates, 'Query', {
          schema,
          type: queryType,
        });
      }
      if (mutationType) {
        addTypeCandidate(typeCandidates, 'Mutation', {
          schema,
          type: mutationType,
        });
      }
      if (subscriptionType) {
        addTypeCandidate(typeCandidates, 'Subscription', {
          schema,
          type: subscriptionType,
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
            schema,
            type: type,
          });
        }
      });
    } else if (typeof schema === 'string') {
      let parsedSchemaDocument = parse(schema);
      parsedSchemaDocument.definitions.forEach(def => {
        const type = typeFromAST(def, createNamedStub);
        if (type) {
          addTypeCandidate(typeCandidates, type.name, {
            type: type,
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
          type: type,
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
    const resultType: VisitTypeResult = visitType(
      typeName,
      typeCandidates[typeName],
    );
    if (resultType === null) {
      types[typeName] = null;
    } else {
      let type: GraphQLNamedType;
      let typeResolvers: IResolvers;
      if (isNamedType(<GraphQLNamedType>resultType)) {
        type = <GraphQLNamedType>resultType;
      } else if ((<TypeWithResolvers>resultType).type) {
        type = (<TypeWithResolvers>resultType).type;
        typeResolvers = (<TypeWithResolvers>resultType).resolvers;
      } else {
        throw new Error('Invalid `visitType` result for type "${typeName}"');
      }
      types[typeName] = recreateType(type, resolveType, false);
      if (typeResolvers) {
        generatedResolvers[typeName] = typeResolvers;
      }
    }
  });

  let mergedSchema = new GraphQLSchema({
    query: types.Query as GraphQLObjectType,
    mutation: types.Mutation as GraphQLObjectType,
    subscription: types.Subscription as GraphQLObjectType,
    types: Object.keys(types).map(key => types[key]),
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
        const parsedFragment = parseFragmentToInlineFragment(field.fragment);
        const actualTypeName = parsedFragment.typeCondition.name.value;
        fragments[actualTypeName] = fragments[actualTypeName] || {};
        fragments[actualTypeName][fieldName] = parsedFragment;
      }
    });
  });

  addResolveFunctionsToSchema(
    mergedSchema,
    mergeDeep(generatedResolvers, resolvers),
  );

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

  return mergedSchema;
}

function createMergeInfo(
  allSchemas: Array<GraphQLSchema>,
  fragmentReplacements: {
    [name: string]: { [fieldName: string]: InlineFragmentNode };
  },
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
      const expandTransforms = Transforms.ExpandAbstractTypes(
        info.schema,
        schema,
      );
      const fragmentTransform = Transforms.ReplaceFieldWithFragment(
        schema,
        fragmentReplacements,
      );
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
        transforms: [
          ...(options.transforms || []),
          Transforms.ExpandAbstractTypes(
            options.info.schema,
            options.schema,
          ),
          Transforms.ReplaceFieldWithFragment(
            options.schema,
            fragmentReplacements,
          ),
        ],
      });
    },
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
    `Could not find subschema with field \`{operation}.{fieldName}\``,
  );
}

function createDelegatingResolver(
  schema: GraphQLSchema,
  operation: 'query' | 'mutation' | 'subscription',
  fieldName: string,
): IFieldResolver<any, any> {
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

function parseFragmentToInlineFragment(
  definitions: string,
): InlineFragmentNode {
  const document = parse(definitions);
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      return {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: definition.typeCondition,
        selectionSet: definition.selectionSet,
      };
    }
  }
  throw new Error('Could not parse fragment');
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

function createVisitTypeFromOnTypeConflict(
  onTypeConflict: OnTypeConflict,
): VisitType {
  return (name, candidates) =>
    defaultVisitType(name, candidates, cands =>
      cands.reduce((prev, next) => {
        const type = onTypeConflict(prev.type, next.type, {
          left: {
            schema: prev.schema,
          },
          right: {
            schema: prev.schema,
          },
        });
        if (prev.type === type) {
          return prev;
        } else if (next.type === type) {
          return next;
        } else {
          return {
            schemaName: 'unknown',
            type,
          };
        }
      }),
    );
}

const defaultVisitType = (
  name: string,
  candidates: Array<MergeTypeCandidate>,
  candidateSelector?: (
    candidates: Array<MergeTypeCandidate>,
  ) => MergeTypeCandidate,
) => {
  if (!candidateSelector) {
    candidateSelector = cands => cands[cands.length - 1];
  }
  const resolveType = createResolveType((_, type) => type);
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
    candidates.forEach(({ type: candidateType, schema }) => {
      const candidateFields = (candidateType as GraphQLObjectType).getFields();
      fields = { ...fields, ...candidateFields };
      Object.keys(candidateFields).forEach(fieldName => {
        resolvers[fieldName] = {
          [resolverKey]: createDelegatingResolver(
            schema,
            operationName,
            fieldName,
          ),
        };
      });
    });
    const type = new GraphQLObjectType({
      name,
      fields: fieldMapToFieldConfigMap(fields, resolveType, false),
    });
    return {
      type,
      resolvers,
    };
  } else {
    const candidate = candidateSelector(candidates);
    return candidate.type;
  }
};
