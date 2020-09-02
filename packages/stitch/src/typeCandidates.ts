import {
  DocumentNode,
  GraphQLNamedType,
  GraphQLSchema,
  getNamedType,
  isNamedType,
  GraphQLDirective,
  ASTNode,
  isSchema,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  isSpecifiedScalarType,
} from 'graphql';

import { wrapSchema } from '@graphql-tools/wrap';
import { isSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';

import {
  extractTypeDefinitions,
  extractTypeExtensionDefinitions,
  extractDirectiveDefinitions,
  extractSchemaDefinition,
  extractSchemaExtensions,
} from './definitions';

import typeFromAST from './typeFromAST';
import { MergeTypeCandidate, MergeTypeFilter, OnTypeConflict, StitchingInfo, TypeMergingOptions } from './types';
import { TypeMap } from '@graphql-tools/utils';
import { mergeCandidates } from './mergeCandidates';

type CandidateSelector = (candidates: Array<MergeTypeCandidate>) => MergeTypeCandidate;

function isDocumentNode(schemaLikeObject: any): schemaLikeObject is DocumentNode {
  return (schemaLikeObject as ASTNode).kind !== undefined;
}

export function buildTypeCandidates({
  schemaLikeObjects,
  transformedSchemas,
  extensions,
  directiveMap,
  schemaDefs,
  operationTypeNames,
  mergeDirectives,
}: {
  schemaLikeObjects: Array<GraphQLSchema | SubschemaConfig | DocumentNode | GraphQLNamedType>;
  transformedSchemas: Map<GraphQLSchema | SubschemaConfig, GraphQLSchema>;
  extensions: Array<DocumentNode>;
  directiveMap: Record<string, GraphQLDirective>;
  schemaDefs: {
    schemaDef: SchemaDefinitionNode;
    schemaExtensions: Array<SchemaExtensionNode>;
  };
  operationTypeNames: Record<string, any>;
  mergeDirectives: boolean;
}): Record<string, Array<MergeTypeCandidate>> {
  const typeCandidates: Record<string, Array<MergeTypeCandidate>> = Object.create(null);

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

      transformedSchemas.set(schemaLikeObject, schema);

      const operationTypes = {
        query: schema.getQueryType(),
        mutation: schema.getMutationType(),
        subscription: schema.getSubscriptionType(),
      };

      Object.keys(operationTypes).forEach(operationType => {
        if (operationTypes[operationType] != null) {
          addTypeCandidate(typeCandidates, operationTypeNames[operationType], {
            type: operationTypes[operationType],
            subschema: schemaLikeObject,
            transformedSchema: schema,
          });
        }
      });

      if (mergeDirectives) {
        schema.getDirectives().forEach(directive => {
          directiveMap[directive.name] = directive;
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
            type,
            subschema: schemaLikeObject,
            transformedSchema: schema,
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
        const directive = typeFromAST(def) as GraphQLDirective;
        directiveMap[directive.name] = directive;
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

  return typeCandidates;
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
  stitchingInfo,
  operationTypeNames,
  onTypeConflict,
  mergeTypes,
  typeMergingOptions,
}: {
  typeCandidates: Record<string, Array<MergeTypeCandidate>>;
  stitchingInfo: StitchingInfo;
  operationTypeNames: Record<string, any>;
  onTypeConflict: OnTypeConflict;
  mergeTypes: boolean | Array<string> | MergeTypeFilter;
  typeMergingOptions: TypeMergingOptions;
}): TypeMap {
  const typeMap: TypeMap = Object.create(null);

  Object.keys(typeCandidates).forEach(typeName => {
    if (
      typeName === operationTypeNames.query ||
      typeName === operationTypeNames.mutation ||
      typeName === operationTypeNames.subscription ||
      (mergeTypes === true && !typeCandidates[typeName].some(candidate => isSpecifiedScalarType(candidate.type))) ||
      (typeof mergeTypes === 'function' && mergeTypes(typeCandidates[typeName], typeName)) ||
      (Array.isArray(mergeTypes) && mergeTypes.includes(typeName)) ||
      (stitchingInfo != null && typeName in stitchingInfo.mergedTypes)
    ) {
      typeMap[typeName] = mergeCandidates(typeName, typeCandidates[typeName], typeMergingOptions);
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
          schema: prev.transformedSchema,
        },
        right: {
          schema: next.transformedSchema,
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
