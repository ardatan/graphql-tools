import {
  DocumentNode,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  getNamedType,
  isNamedType,
  GraphQLDirective,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  ASTNode,
  isSchema,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  GraphQLInterfaceTypeConfig,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  specifiedDirectives,
} from 'graphql';

import { mergeDeep } from '../esUtils/mergeDeep';

import {
  OnTypeConflict,
  isSubschemaConfig,
  SchemaLikeObject,
  IResolvers,
  IMakeExecutableSchemaOptions,
  MergeTypeCandidate,
  MergeInfo,
  MergeTypeFilter,
  IResolversParameter,
} from '../Interfaces';
import { addResolversToSchema } from '../addResolvers/index';
import { wrapSchema } from '../wrap/wrapSchema';
import {
  SchemaDirectiveVisitor,
  cloneDirective,
  rewireTypes,
  forEachField,
  graphqlVersion,
  SchemaError,
} from '../utils/index';
import { toConfig, extendSchema } from '../polyfills/index';

import addSchemaLevelResolver from './addSchemaLevelResolver';
import { addErrorLoggingToSchema, addCatchUndefinedToSchema } from './decorate';
import assertResolversPresent from './assertResolversPresent';
import attachDirectiveResolvers from './attachDirectiveResolvers';
import { buildDocumentFromTypeDefinitions } from './buildSchemaFromTypeDefinitions';
import {
  extractTypeDefinitions,
  extractTypeExtensionDefinitions,
  extractDirectiveDefinitions,
  extractSchemaDefinition,
  extractSchemaExtensions,
} from './definitions';
import typeFromAST from './typeFromAST';
import { createMergeInfo, completeMergeInfo } from './mergeInfo';

type CandidateSelector = (
  candidates: Array<MergeTypeCandidate>,
) => MergeTypeCandidate;

export function makeExecutableSchema({
  subschemas = [],
  types = [],
  typeDefs,
  onTypeConflict,
  resolvers = {},
  schemaDirectives,
  inheritResolversFromInterfaces = false,
  mergeTypes = false,
  mergeDirectives,
  logger,
  allowUndefinedInResolve = true,
  resolverValidationOptions = {},
  directiveResolvers,
  parseOptions = {},
}: IMakeExecutableSchemaOptions): GraphQLSchema {
  if (typeof resolverValidationOptions !== 'object') {
    throw new SchemaError(
      'Expected `resolverValidationOptions` to be an object',
    );
  }

  const allSchemas: Array<GraphQLSchema> = [];
  const typeCandidates: Record<
    string,
    Array<MergeTypeCandidate>
  > = Object.create(null);
  const extensions: Array<DocumentNode> = [];
  const directives: Array<GraphQLDirective> = [];
  const schemaDefs = Object.create(null);
  const operationTypeNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  const schemaLikeObjects: Array<SchemaLikeObject> = [...subschemas];
  if (typeDefs) {
    schemaLikeObjects.push(
      buildDocumentFromTypeDefinitions(typeDefs, parseOptions),
    );
  }
  if (types != null) {
    schemaLikeObjects.push(types);
  }

  buildTypeCandidates({
    schemaLikeObjects,
    allSchemas,
    typeCandidates,
    extensions,
    directives,
    schemaDefs,
    operationTypeNames,
    mergeDirectives,
  });

  let mergeInfo: MergeInfo;

  if (subschemas.length) {
    mergeInfo = createMergeInfo(allSchemas, typeCandidates, mergeTypes);
  }

  const finalResolvers = getFinalResolvers(resolvers, mergeInfo);

  if (subschemas.length) {
    mergeInfo = completeMergeInfo(mergeInfo, finalResolvers);
  }

  const typeMap = buildTypeMap({
    typeCandidates,
    mergeTypes,
    mergeInfo,
    onTypeConflict,
    operationTypeNames,
  });

  const {
    typeMap: newTypeMap,
    directives: newDirectives,
  } = rewireTypes(typeMap, directives, { skipPruning: true });

  let stitchedSchema = new GraphQLSchema({
    query: newTypeMap[operationTypeNames.query] as GraphQLObjectType,
    mutation: newTypeMap[operationTypeNames.mutation] as GraphQLObjectType,
    subscription: newTypeMap[
      operationTypeNames.subscription
    ] as GraphQLObjectType,
    types: Object.keys(newTypeMap).map((key) => newTypeMap[key]),
    directives: newDirectives.length
      ? specifiedDirectives
          .slice()
          .concat(newDirectives.map((directive) => cloneDirective(directive)))
      : undefined,
    astNode: schemaDefs.schemaDef,
    extensionASTNodes: schemaDefs.schemaExtensions,
    extensions: null,
  });

  extensions.forEach((extension) => {
    stitchedSchema = extendSchema(stitchedSchema, extension, {
      commentDescriptions: true,
    });
  });

  addResolversToSchema({
    schema: stitchedSchema,
    resolvers: finalResolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces,
  });

  assertResolversPresent(stitchedSchema, resolverValidationOptions);

  if (subschemas.length) {
    addMergeInfo(stitchedSchema, mergeInfo);
  }

  if (!allowUndefinedInResolve) {
    addCatchUndefinedToSchema(stitchedSchema);
  }

  if (logger != null) {
    addErrorLoggingToSchema(stitchedSchema, logger);
  }

  if (typeof finalResolvers['__schema'] === 'function') {
    // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
    // not doing that now, because I'd have to rewrite a lot of tests.
    addSchemaLevelResolver(stitchedSchema, finalResolvers['__schema']);
  }

  if (directiveResolvers != null) {
    attachDirectiveResolvers(stitchedSchema, directiveResolvers);
  }

  if (schemaDirectives != null) {
    SchemaDirectiveVisitor.visitSchemaDirectives(
      stitchedSchema,
      schemaDirectives,
    );
  }

  return stitchedSchema;
}

export function isDocumentNode(
  schemaLikeObject: SchemaLikeObject,
): schemaLikeObject is DocumentNode {
  return (schemaLikeObject as ASTNode).kind !== undefined;
}

function buildTypeCandidates({
  schemaLikeObjects,
  allSchemas,
  typeCandidates,
  extensions,
  directives,
  schemaDefs,
  operationTypeNames,
  mergeDirectives,
}: {
  schemaLikeObjects: Array<SchemaLikeObject>;
  allSchemas: Array<GraphQLSchema>;
  typeCandidates: Record<string, Array<MergeTypeCandidate>>;
  extensions: Array<DocumentNode>;
  directives: Array<GraphQLDirective>;
  schemaDefs: {
    schemaDef: SchemaDefinitionNode;
    schemaExtensions: Array<SchemaExtensionNode>;
  };
  operationTypeNames: Record<string, any>;
  mergeDirectives: boolean;
}): void {
  let schemaDef: SchemaDefinitionNode;
  let schemaExtensions: Array<SchemaExtensionNode> = [];

  schemaLikeObjects.forEach((schemaLikeObject) => {
    if (isDocumentNode(schemaLikeObject)) {
      schemaDef = extractSchemaDefinition(schemaLikeObject);
      schemaExtensions = schemaExtensions.concat(
        extractSchemaExtensions(schemaLikeObject),
      );
    }
  });

  schemaDefs.schemaDef = schemaDef;
  schemaDefs.schemaExtensions = schemaExtensions;

  setOperationTypeNames(schemaDefs, operationTypeNames);

  schemaLikeObjects.forEach((schemaLikeObject) => {
    if (isSchema(schemaLikeObject) || isSubschemaConfig(schemaLikeObject)) {
      const schema = wrapSchema(schemaLikeObject);

      allSchemas.push(schema);

      const operationTypes = {
        query: schema.getQueryType(),
        mutation: schema.getMutationType(),
        subscription: schema.getSubscriptionType(),
      };

      Object.keys(operationTypes).forEach((operationType) => {
        if (operationTypes[operationType] != null) {
          addTypeCandidate(typeCandidates, operationTypeNames[operationType], {
            schema,
            type: operationTypes[operationType],
            subschema: schemaLikeObject,
            transformedSubschema: schema,
          });
        }
      });

      if (mergeDirectives) {
        schema.getDirectives().forEach((directive) => {
          directives.push(directive);
        });
      }

      const originalTypeMap = schema.getTypeMap();
      Object.keys(originalTypeMap).forEach((typeName) => {
        const type: GraphQLNamedType = originalTypeMap[typeName];
        if (
          isNamedType(type) &&
          getNamedType(type).name.slice(0, 2) !== '__' &&
          type !== operationTypes.query &&
          type !== operationTypes.mutation &&
          type !== operationTypes.subscription
        ) {
          addTypeCandidate(typeCandidates, type.name, {
            schema,
            type,
            subschema: schemaLikeObject,
            transformedSubschema: schema,
          });
        }
      });
    } else if (isDocumentNode(schemaLikeObject)) {
      const typesDocument = extractTypeDefinitions(schemaLikeObject);
      typesDocument.definitions.forEach((def) => {
        const type = typeFromAST(def) as GraphQLNamedType;
        if (type != null) {
          addTypeCandidate(typeCandidates, type.name, {
            type,
          });
        }
      });

      const directivesDocument = extractDirectiveDefinitions(schemaLikeObject);
      directivesDocument.definitions.forEach((def) => {
        directives.push(typeFromAST(def) as GraphQLDirective);
      });

      const extensionsDocument = extractTypeExtensionDefinitions(
        schemaLikeObject,
      );
      if (extensionsDocument.definitions.length > 0) {
        extensions.push(extensionsDocument);
      }
    } else if (Array.isArray(schemaLikeObject)) {
      schemaLikeObject.forEach((type) => {
        addTypeCandidate(typeCandidates, type.name, {
          type,
        });
      });
    } else {
      throw new Error('Invalid schema passed');
    }
  });
}

function setOperationTypeNames(
  {
    schemaDef,
    schemaExtensions,
  }: {
    schemaDef: SchemaDefinitionNode;
    schemaExtensions: Array<SchemaExtensionNode>;
  },
  operationTypeNames: Record<string, any>,
): void {
  const allNodes: Array<
    SchemaDefinitionNode | SchemaExtensionNode
  > = schemaExtensions.slice();
  if (schemaDef != null) {
    allNodes.unshift(schemaDef);
  }

  allNodes.forEach((node) => {
    if (node.operationTypes != null) {
      node.operationTypes.forEach((operationType) => {
        operationTypeNames[operationType.operation] =
          operationType.type.name.value;
      });
    }
  });
}

function addTypeCandidate(
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  name: string,
  typeCandidate: MergeTypeCandidate,
) {
  if (!(name in typeCandidates)) {
    typeCandidates[name] = [];
  }
  typeCandidates[name].push(typeCandidate);
}

function buildTypeMap({
  typeCandidates,
  mergeTypes,
  mergeInfo,
  onTypeConflict,
  operationTypeNames,
}: {
  typeCandidates: Record<string, Array<MergeTypeCandidate>>;
  mergeTypes: boolean | Array<string> | MergeTypeFilter;
  mergeInfo: MergeInfo;
  onTypeConflict: OnTypeConflict;
  operationTypeNames: Record<string, any>;
}): Record<string, GraphQLNamedType> {
  const typeMap: Record<string, GraphQLNamedType> = Object.create(null);

  Object.keys(typeCandidates).forEach((typeName) => {
    if (
      typeName === operationTypeNames.query ||
      typeName === operationTypeNames.mutation ||
      typeName === operationTypeNames.subscription ||
      (mergeTypes === true &&
        !isScalarType(typeCandidates[typeName][0].type)) ||
      (typeof mergeTypes === 'function' &&
        mergeTypes(typeCandidates[typeName], typeName)) ||
      (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
      (mergeInfo != null && typeName in mergeInfo.mergedTypes)
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

  return typeMap;
}

function onTypeConflictToCandidateSelector(
  onTypeConflict: OnTypeConflict,
): CandidateSelector {
  return (cands) =>
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
      (candidate) =>
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
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
    });
  } else if (isInterfaceType(initialCandidateType)) {
    const config: GraphQLInterfaceTypeConfig<any, any> = {
      name: typeName,
      fields: candidates.reduce(
        (acc, candidate) => ({
          ...acc,
          ...toConfig(candidate.type as GraphQLInterfaceType).fields,
        }),
        {},
      ),
      ...((graphqlVersion() >= 15
        ? {
            interfaces: candidates.reduce((acc, candidate) => {
              const interfaces = toConfig(
                candidate.type as GraphQLInterfaceType,
              ).interfaces;
              return interfaces != null ? acc.concat(interfaces) : acc;
            }, []),
          }
        : {}) as any),
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
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
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
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
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
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

function addMergeInfo(
  stitchedSchema: GraphQLSchema,
  mergeInfo: MergeInfo,
): void {
  forEachField(stitchedSchema, (field) => {
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
}

function getFinalResolvers(
  resolvers: IResolversParameter,
  mergeInfo: MergeInfo,
): IResolvers {
  let finalResolvers: IResolvers;

  if (typeof resolvers === 'function') {
    finalResolvers = resolvers(mergeInfo);
  } else if (Array.isArray(resolvers)) {
    finalResolvers = resolvers.reduce(
      (left, right) =>
        mergeDeep(left, typeof right === 'function' ? right(mergeInfo) : right),
      {},
    );
    finalResolvers = resolvers.reduce<any>(mergeDeep, {});
  } else {
    finalResolvers = resolvers;
  }

  if (finalResolvers == null) {
    finalResolvers = {};
  }

  return finalResolvers;
}
