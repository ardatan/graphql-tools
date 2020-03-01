import {
  DocumentNode,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  getNamedType,
  isNamedType,
  parse,
  Kind,
  GraphQLDirective,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  ASTNode,
  isSchema,
  isDirective,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
} from 'graphql';

import {
  OnTypeConflict,
  IResolversParameter,
  isSubschemaConfig,
  SchemaLikeObject,
  IResolvers,
  SubschemaConfig,
} from '../Interfaces';
import {
  extractExtensionDefinitions,
  addResolversToSchema,
} from '../makeExecutableSchema';
import { wrapSchema } from '../transforms';
import {
  SchemaDirectiveVisitor,
  cloneDirective,
  healTypes,
  forEachField,
  mergeDeep,
  graphqlVersion,
} from '../utils';
import { toConfig, extendSchema } from '../polyfills';

import typeFromAST from './typeFromAST';
import { createMergeInfo, completeMergeInfo } from './mergeInfo';

type MergeTypeCandidate = {
  type: GraphQLNamedType;
  schema?: GraphQLSchema;
  subschema?: GraphQLSchema | SubschemaConfig;
  transformedSubschema?: GraphQLSchema;
};

type CandidateSelector = (
  candidates: Array<MergeTypeCandidate>,
) => MergeTypeCandidate;

export default function mergeSchemas({
  subschemas = [],
  types = [],
  typeDefs,
  schemas: schemaLikeObjects = [],
  onTypeConflict,
  resolvers = {},
  schemaDirectives,
  inheritResolversFromInterfaces,
  mergeTypes = false,
  mergeDirectives,
}: {
  subschemas?: Array<GraphQLSchema | SubschemaConfig>;
  types?: Array<GraphQLNamedType>;
  typeDefs?: string | DocumentNode;
  schemas?: Array<SchemaLikeObject>;
  onTypeConflict?: OnTypeConflict;
  resolvers?: IResolversParameter;
  schemaDirectives?: { [name: string]: typeof SchemaDirectiveVisitor };
  inheritResolversFromInterfaces?: boolean;
  mergeTypes?:
    | boolean
    | Array<string>
    | ((
        typeName: string,
        mergeTypeCandidates: Array<MergeTypeCandidate>,
      ) => boolean);
  mergeDirectives?: boolean;
}): GraphQLSchema {
  const allSchemas: Array<GraphQLSchema> = [];
  const typeCandidates: { [name: string]: Array<MergeTypeCandidate> } = {};
  const typeMap: { [name: string]: GraphQLNamedType } = {};
  const extensions: Array<DocumentNode> = [];
  const directives: Array<GraphQLDirective> = [];

  let schemas: Array<SchemaLikeObject> = [...subschemas];
  if (typeDefs) {
    schemas.push(typeDefs);
  }
  if (types != null) {
    schemas.push(types);
  }
  schemas = [...schemas, ...schemaLikeObjects];

  schemas.forEach(schemaLikeObject => {
    if (isSchema(schemaLikeObject) || isSubschemaConfig(schemaLikeObject)) {
      const schema = wrapSchema(schemaLikeObject);

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
            type: operationTypes[typeName],
            subschema: schemaLikeObject,
            transformedSubschema: schema,
          });
        }
      });

      if (mergeDirectives) {
        const directiveInstances = schema.getDirectives();
        directiveInstances.forEach(directive => {
          directives.push(directive);
        });
      }

      const originalTypeMap = schema.getTypeMap();
      Object.keys(originalTypeMap).forEach(typeName => {
        const type: GraphQLNamedType = originalTypeMap[typeName];
        if (
          isNamedType(type) &&
          getNamedType(type).name.slice(0, 2) !== '__' &&
          type !== operationTypes.Query &&
          type !== operationTypes.Mutation &&
          type !== operationTypes.Subscription
        ) {
          addTypeCandidate(typeCandidates, type.name, {
            schema,
            type,
            subschema: schemaLikeObject,
            transformedSubschema: schema,
          });
        }
      });
    } else if (
      typeof schemaLikeObject === 'string' ||
      (schemaLikeObject != null &&
        (schemaLikeObject as ASTNode).kind === Kind.DOCUMENT)
    ) {
      const parsedSchemaDocument =
        typeof schemaLikeObject === 'string'
          ? parse(schemaLikeObject)
          : (schemaLikeObject as DocumentNode);

      parsedSchemaDocument.definitions.forEach(def => {
        const type = typeFromAST(def);
        if (isDirective(type) && mergeDirectives) {
          directives.push(type);
        } else if (type != null && !isDirective(type)) {
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
      throw new Error('Invalid schema passed');
    }
  });

  let mergeInfo = createMergeInfo(allSchemas, typeCandidates, mergeTypes);

  let finalResolvers: IResolvers;
  if (typeof resolvers === 'function') {
    finalResolvers = resolvers(mergeInfo);
  } else if (Array.isArray(resolvers)) {
    finalResolvers = resolvers.reduce(
      (left, right) =>
        mergeDeep(left, typeof right === 'function' ? right(mergeInfo) : right),
      {},
    );
    if (Array.isArray(resolvers)) {
      finalResolvers = resolvers.reduce(mergeDeep, {});
    }
  } else {
    finalResolvers = resolvers;
  }

  if (finalResolvers == null) {
    finalResolvers = {};
  }

  mergeInfo = completeMergeInfo(mergeInfo, finalResolvers);

  Object.keys(typeCandidates).forEach(typeName => {
    if (
      typeName === 'Query' ||
      typeName === 'Mutation' ||
      typeName === 'Subscription' ||
      (mergeTypes === true &&
        !isScalarType(typeCandidates[typeName][0].type)) ||
      (typeof mergeTypes === 'function' &&
        mergeTypes(typeName, typeCandidates[typeName])) ||
      (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
      mergeInfo.mergedTypes[typeName] != null
    ) {
      typeMap[typeName] = merge(typeName, typeCandidates[typeName]);
    } else {
      const candidateSelector =
        onTypeConflict != null
          ? onTypeConflictToCandidateSelector(onTypeConflict)
          : (cands: Array<MergeTypeCandidate>) => cands[cands.length - 1];
      typeMap[typeName] = candidateSelector(typeCandidates[typeName]).type;
    }
  });

  healTypes(typeMap, directives, { skipPruning: true });

  let mergedSchema = new GraphQLSchema({
    query: typeMap.Query as GraphQLObjectType,
    mutation: typeMap.Mutation as GraphQLObjectType,
    subscription: typeMap.Subscription as GraphQLObjectType,
    types: Object.keys(typeMap).map(key => typeMap[key]),
    directives: directives.length
      ? directives.map(directive => cloneDirective(directive))
      : undefined,
  });

  extensions.forEach(extension => {
    mergedSchema = extendSchema(mergedSchema, extension, {
      commentDescriptions: true,
    });
  });

  addResolversToSchema({
    schema: mergedSchema,
    resolvers: finalResolvers,
    inheritResolversFromInterfaces,
  });

  forEachField(mergedSchema, field => {
    if (field.resolve != null) {
      const fieldResolver = field.resolve;
      field.resolve = (parent, args, context, info) => {
        const newInfo = { ...info, mergeInfo };
        return fieldResolver(parent, args, context, newInfo);
      };
    }
    if (field.subscribe != null) {
      const fieldResolver = field.subscribe;
      field.subscribe = (parent, args, context, info) => {
        const newInfo = { ...info, mergeInfo };
        return fieldResolver(parent, args, context, newInfo);
      };
    }
  });

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(
      mergedSchema,
      schemaDirectives,
    );
  }

  return mergedSchema;
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

function onTypeConflictToCandidateSelector(
  onTypeConflict: OnTypeConflict,
): CandidateSelector {
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
      }
      return {
        schemaName: 'unknown',
        type,
      };
    });
}

function merge(
  typeName: string,
  candidates: Array<MergeTypeCandidate>,
): GraphQLNamedType {
  const initialCandidateType = candidates[0].type;
  if (
    candidates.some(
      candidate =>
        candidate.type.constructor !== initialCandidateType.constructor,
    )
  ) {
    throw new Error(
      `Cannot merge different type categories into common type ${typeName}.`,
    );
  }
  if (isObjectType(initialCandidateType)) {
    return new GraphQLObjectType({
      name: typeName,
      fields: candidates.reduce(
        (acc, candidate) => ({
          ...acc,
          ...toConfig(candidate.type as GraphQLObjectType).fields,
        }),
        {},
      ),
      interfaces: candidates.reduce((acc, candidate) => {
        const interfaces = toConfig(candidate.type as GraphQLObjectType)
          .interfaces;
        return interfaces != null ? acc.concat(interfaces) : acc;
      }, []),
    });
  } else if (isInterfaceType(initialCandidateType)) {
    const config = {
      name: typeName,
      fields: candidates.reduce(
        (acc, candidate) => ({
          ...acc,
          ...toConfig(candidate.type as GraphQLObjectType).fields,
        }),
        {},
      ),
      interfaces:
        graphqlVersion() >= 15
          ? candidates.reduce((acc, candidate) => {
              const interfaces = toConfig(candidate.type as GraphQLObjectType)
                .interfaces;
              return interfaces != null ? acc.concat(interfaces) : acc;
            }, [])
          : undefined,
    };
    return new GraphQLInterfaceType(config);
  } else if (isUnionType(initialCandidateType)) {
    return new GraphQLUnionType({
      name: typeName,
      types: candidates.reduce(
        (acc, candidate) =>
          acc.concat(toConfig(candidate.type as GraphQLUnionType).types),
        [],
      ),
    });
  } else if (isEnumType(initialCandidateType)) {
    return new GraphQLEnumType({
      name: typeName,
      values: candidates.reduce(
        (acc, candidate) => ({
          ...acc,
          ...toConfig(candidate.type as GraphQLEnumType).values,
        }),
        {},
      ),
    });
  } else if (isScalarType(initialCandidateType)) {
    throw new Error(
      `Cannot merge type ${typeName}. Merging not supported for GraphQLScalarType.`,
    );
  } else {
    // not reachable.
    throw new Error(`Type ${typeName} has unknown GraphQL type.`);
  }
}
