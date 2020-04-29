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
  SchemaDefinitionNode,
  SchemaExtensionNode,
  GraphQLFieldConfigMap,
} from 'graphql';

import { wrapSchema, isSubschemaConfig, SubschemaConfig } from '@graphql-tools/schema-wrapping';

import {
  extractTypeDefinitions,
  extractTypeExtensionDefinitions,
  extractDirectiveDefinitions,
  extractSchemaDefinition,
  extractSchemaExtensions,
} from './definitions';

import typeFromAST from './typeFromAST';
import { MergeTypeCandidate, MergeTypeFilter, OnTypeConflict, MergeInfo } from './types';

type CandidateSelector = (candidates: Array<MergeTypeCandidate>) => MergeTypeCandidate;

function isDocumentNode(schemaLikeObject: any): schemaLikeObject is DocumentNode {
  return (schemaLikeObject as ASTNode).kind !== undefined;
}

export function buildTypeCandidates({
  schemaLikeObjects,
  allSchemas,
  typeCandidates,
  extensions,
  directives,
  schemaDefs,
  operationTypeNames,
  mergeDirectives,
}: {
  schemaLikeObjects: Array<GraphQLSchema | SubschemaConfig | DocumentNode | GraphQLNamedType>;
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

  schemaLikeObjects.forEach(schemaLikeObject => {
    if (isDocumentNode(schemaLikeObject)) {
      schemaDef = extractSchemaDefinition(schemaLikeObject);
      schemaExtensions = schemaExtensions.concat(extractSchemaExtensions(schemaLikeObject));
    }
  });

  schemaDefs.schemaDef = schemaDef;
  schemaDefs.schemaExtensions = schemaExtensions;

  setOperationTypeNames(schemaDefs, operationTypeNames);

  schemaLikeObjects.forEach(schemaLikeObject => {
    if (isSchema(schemaLikeObject) || isSubschemaConfig(schemaLikeObject)) {
      const schema = wrapSchema(schemaLikeObject);

      allSchemas.push(schema);

      const operationTypes = {
        query: schema.getQueryType(),
        mutation: schema.getMutationType(),
        subscription: schema.getSubscriptionType(),
      };

      Object.keys(operationTypes).forEach(operationType => {
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
        schema.getDirectives().forEach(directive => {
          directives.push(directive);
        });
      }

      const originalTypeMap = schema.getTypeMap();
      Object.keys(originalTypeMap).forEach(typeName => {
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
      typesDocument.definitions.forEach(def => {
        const type = typeFromAST(def) as GraphQLNamedType;
        if (type != null) {
          addTypeCandidate(typeCandidates, type.name, {
            type,
          });
        }
      });

      const directivesDocument = extractDirectiveDefinitions(schemaLikeObject);
      directivesDocument.definitions.forEach(def => {
        directives.push(typeFromAST(def) as GraphQLDirective);
      });

      const extensionsDocument = extractTypeExtensionDefinitions(schemaLikeObject);
      if (extensionsDocument.definitions.length > 0) {
        extensions.push(extensionsDocument);
      }
    } else if (isNamedType(schemaLikeObject)) {
      addTypeCandidate(typeCandidates, schemaLikeObject.name, {
        type: schemaLikeObject,
      });
    } else {
      throw new Error(`Invalid object ${schemaLikeObject as string}`);
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
  operationTypeNames: Record<string, any>
): void {
  const allNodes: Array<SchemaDefinitionNode | SchemaExtensionNode> = schemaExtensions.slice();
  if (schemaDef != null) {
    allNodes.unshift(schemaDef);
  }

  allNodes.forEach(node => {
    if (node.operationTypes != null) {
      node.operationTypes.forEach(operationType => {
        operationTypeNames[operationType.operation] = operationType.type.name.value;
      });
    }
  });
}

function addTypeCandidate(
  typeCandidates: Record<string, Array<MergeTypeCandidate>>,
  name: string,
  typeCandidate: MergeTypeCandidate
) {
  if (!(name in typeCandidates)) {
    typeCandidates[name] = [];
  }
  typeCandidates[name].push(typeCandidate);
}

export function buildTypeMap({
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

  Object.keys(typeCandidates).forEach(typeName => {
    if (
      typeName === operationTypeNames.query ||
      typeName === operationTypeNames.mutation ||
      typeName === operationTypeNames.subscription ||
      (mergeTypes === true && !isScalarType(typeCandidates[typeName][0].type)) ||
      (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
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
      }
      return {
        schemaName: 'unknown',
        type,
      };
    });
}

function merge(typeName: string, candidates: Array<MergeTypeCandidate>): GraphQLNamedType {
  const initialCandidateType = candidates[0].type;
  if (candidates.some(candidate => candidate.type.constructor !== initialCandidateType.constructor)) {
    throw new Error(`Cannot merge different type categories into common type ${typeName}.`);
  }
  if (isObjectType(initialCandidateType)) {
    const config = {
      name: typeName,
      fields: candidates.reduce<GraphQLFieldConfigMap<any, any>>(
        (acc, candidate) => ({
          ...acc,
          ...(candidate.type as GraphQLObjectType).toConfig().fields,
        }),
        {}
      ),
      interfaces: candidates.reduce((acc, candidate) => {
        const interfaces = (candidate.type as GraphQLObjectType).toConfig().interfaces;
        return interfaces != null ? acc.concat(interfaces) : acc;
      }, []),
      description: initialCandidateType.description,
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
    };
    return new GraphQLObjectType(config);
  } else if (isInterfaceType(initialCandidateType)) {
    const config = {
      name: typeName,
      fields: candidates.reduce<GraphQLFieldConfigMap<any, any>>(
        (acc, candidate) => ({
          ...acc,
          ...(candidate.type as GraphQLInterfaceType).toConfig().fields,
        }),
        {}
      ),
      interfaces: candidates.reduce((acc, candidate) => {
        const candidateConfig = candidate.type.toConfig();
        if ('interfaces' in candidateConfig) {
          return acc.concat(candidateConfig.interfaces);
        }
        return acc;
      }, []),
      description: initialCandidateType.description,
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
    };
    return new GraphQLInterfaceType(config);
  } else if (isUnionType(initialCandidateType)) {
    return new GraphQLUnionType({
      name: typeName,
      types: candidates.reduce(
        (acc, candidate) => acc.concat((candidate.type as GraphQLUnionType).toConfig().types),
        []
      ),
      description: initialCandidateType.description,
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
          ...(candidate.type as GraphQLEnumType).toConfig().values,
        }),
        {}
      ),
      description: initialCandidateType.description,
      extensions: initialCandidateType.extensions,
      astNode: initialCandidateType.astNode,
      extensionASTNodes: initialCandidateType.extensionASTNodes,
    });
  } else if (isScalarType(initialCandidateType)) {
    throw new Error(`Cannot merge type ${typeName}. Merging not supported for GraphQLScalarType.`);
  } else {
    // not reachable.
    throw new Error(`Type ${typeName} has unknown GraphQL type.`);
  }
}
