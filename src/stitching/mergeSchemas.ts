import {
  DocumentNode,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  extendSchema,
  getNamedType,
  isNamedType,
  parse,
  Kind,
  GraphQLDirective,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
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
import typeFromAST from './typeFromAST';
import { wrapSchema } from '../transforms';
import {
  SchemaDirectiveVisitor,
  cloneDirective,
  healSchema,
  healTypes,
  forEachField,
  mergeDeep,
} from '../utils';
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
  mergeTypes?: boolean | Array<string> |
    ((typeName: string, mergeTypeCandidates: Array<MergeTypeCandidate>) => boolean);
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
  if (types) {
    schemas.push(types);
  }
  schemas = [...schemas, ...schemaLikeObjects];

  schemas.forEach(schemaLikeObject => {
    if (schemaLikeObject instanceof GraphQLSchema || isSubschemaConfig(schemaLikeObject)) {
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

  let mergeInfo = createMergeInfo(allSchemas, typeCandidates, mergeTypes);

  if (typeof resolvers === 'function') {
    console.warn(
      'Passing functions as resolver parameter is deprecated. Use `info.mergeInfo` instead.',
    );
    resolvers = resolvers(mergeInfo) || {};
  } else if (Array.isArray(resolvers)) {
    resolvers = resolvers.reduce((left, right) => {
      if (typeof right === 'function') {
        console.warn(
          'Passing functions as resolver parameter is deprecated. Use `info.mergeInfo` instead.',
        );
        right = right(mergeInfo);
      }
      return mergeDeep(left, right);
    }, {}) || {};
    if (!resolvers) {
      resolvers = {};
    } else if (Array.isArray(resolvers)) {
      resolvers = resolvers.reduce(mergeDeep, {});
    }
  }

  mergeInfo = completeMergeInfo(mergeInfo, resolvers);

  Object.keys(typeCandidates).forEach(typeName => {
    if (
      (
        typeName === 'Query' ||
        typeName === 'Mutation' ||
        typeName === 'Subscription' ||
        (mergeTypes === true && !(typeCandidates[typeName][0].type instanceof GraphQLScalarType)) ||
        (typeof mergeTypes === 'function') && mergeTypes(typeName, typeCandidates[typeName]) ||
        Array.isArray(mergeTypes) && mergeTypes.includes(typeName) ||
        mergeInfo.mergedTypes[typeName]
      )
    ) {
      typeMap[typeName] = merge(typeName, typeCandidates[typeName]);
    } else {
      const candidateSelector = onTypeConflict ?
        onTypeConflictToCandidateSelector(onTypeConflict) :
        (cands: Array<MergeTypeCandidate>) => cands[cands.length - 1];
      typeMap[typeName] = candidateSelector(typeCandidates[typeName]).type;
    }
  });

  healTypes(typeMap, directives, { skipPruning: true });

  let mergedSchema = new GraphQLSchema({
    query: typeMap.Query as GraphQLObjectType,
    mutation: typeMap.Mutation as GraphQLObjectType,
    subscription: typeMap.Subscription as GraphQLObjectType,
    types: Object.keys(typeMap).map(key => typeMap[key]),
    directives: directives.length ?
      directives.map((directive) => cloneDirective(directive)) :
      undefined
  });

  extensions.forEach(extension => {
    mergedSchema = (extendSchema as any)(mergedSchema, extension, {
      commentDescriptions: true,
    });
  });

  addResolversToSchema({
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

function merge(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLNamedType {
  const initialCandidateType = candidates[0].type;
  if (candidates.some(candidate => candidate.type.constructor !== initialCandidateType.constructor)) {
    throw new Error(`Cannot merge different type categories into common type ${typeName}.`);
  }
  if (initialCandidateType instanceof GraphQLObjectType) {
    return new GraphQLObjectType({
      name: typeName,
      fields: candidates.reduce((acc, candidate) => ({
        ...acc,
        ...(candidate.type as GraphQLObjectType).toConfig().fields,
      }), {}),
      interfaces: candidates.reduce((acc, candidate) => {
        const interfaces = (candidate.type as GraphQLObjectType).toConfig().interfaces;
        return interfaces ? acc.concat(interfaces) : acc;
      }, []),
    });
  } else if (initialCandidateType instanceof GraphQLInterfaceType) {
    return new GraphQLInterfaceType({
      name: typeName,
      fields: candidates.reduce((acc, candidate) => ({
        ...acc,
        ...(candidate.type as GraphQLObjectType).toConfig().fields,
      }), {}),
    });
  } else if (initialCandidateType instanceof GraphQLUnionType) {
    return new GraphQLUnionType({
      name: typeName,
      types: candidates.reduce(
        (acc, candidate) => (candidate.type as GraphQLUnionType).toConfig().types,
        [],
      ),
    });
  } else if (initialCandidateType instanceof GraphQLEnumType) {
    return new GraphQLEnumType({
      name: typeName,
      values: candidates.reduce((acc, candidate) => ({
        ...acc,
        ...(candidate.type as GraphQLEnumType).toConfig().values,
      }), {}),
    });
  } else if (initialCandidateType instanceof GraphQLScalarType) {
    throw new Error(`Cannot merge type ${typeName}. Merging not supported for GraphQLScalarType.`);
  } else {
    // not reachable.
    throw new Error(`Type ${typeName} has unknown GraphQL type.`);
  }
}
