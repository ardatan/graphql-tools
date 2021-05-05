import {
  DocumentNode,
  GraphQLNamedType,
  getNamedType,
  isNamedType,
  GraphQLDirective,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  isSpecifiedScalarType,
  GraphQLSchema,
} from 'graphql';

import { wrapSchema } from '@graphql-tools/wrap';
import { Subschema, SubschemaConfig, StitchingInfo } from '@graphql-tools/delegate';
import { GraphQLParseOptions, ITypeDefinitions, rewireTypes, TypeMap } from '@graphql-tools/utils';
import { buildDocumentFromTypeDefinitions } from '@graphql-tools/schema';

import typeFromAST from './typeFromAST';
import { MergeTypeCandidate, MergeTypeFilter, OnTypeConflict, TypeMergingOptions } from './types';
import { mergeCandidates } from './mergeCandidates';
import { extractDefinitions } from './definitions';

type CandidateSelector = (candidates: Array<MergeTypeCandidate>) => MergeTypeCandidate;

export function buildTypeCandidates({
  subschemas,
  originalSubschemaMap,
  types,
  typeDefs,
  parseOptions,
  extensions,
  directiveMap,
  schemaDefs,
  operationTypeNames,
  mergeDirectives,
}: {
  subschemas: Array<Subschema>;
  originalSubschemaMap: Map<Subschema, GraphQLSchema | SubschemaConfig>;
  types: Array<GraphQLNamedType>;
  typeDefs: ITypeDefinitions;
  parseOptions: GraphQLParseOptions;
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

  let document: DocumentNode;
  let extraction: ReturnType<typeof extractDefinitions>;
  if ((typeDefs && !Array.isArray(typeDefs)) || (Array.isArray(typeDefs) && typeDefs.length)) {
    document = buildDocumentFromTypeDefinitions(typeDefs, parseOptions);
    extraction = extractDefinitions(document);
    schemaDef = extraction.schemaDefs[0];
    schemaExtensions = schemaExtensions.concat(extraction.schemaExtensions);
  }

  schemaDefs.schemaDef = schemaDef;
  schemaDefs.schemaExtensions = schemaExtensions;

  setOperationTypeNames(schemaDefs, operationTypeNames);

  subschemas.forEach(subschema => {
    const schema = wrapSchema(subschema);

    const operationTypes = {
      query: schema.getQueryType(),
      mutation: schema.getMutationType(),
      subscription: schema.getSubscriptionType(),
    };

    Object.keys(operationTypes).forEach(operationType => {
      if (operationTypes[operationType] != null) {
        addTypeCandidate(typeCandidates, operationTypeNames[operationType], {
          type: operationTypes[operationType],
          subschema: originalSubschemaMap.get(subschema),
          transformedSubschema: subschema,
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
          subschema: originalSubschemaMap.get(subschema),
          transformedSubschema: subschema,
        });
      }
    });
  });

  if (document !== undefined) {
    extraction.typeDefinitions.forEach(def => {
      const type = typeFromAST(def) as GraphQLNamedType;
      if (type != null) {
        addTypeCandidate(typeCandidates, type.name, { type });
      }
    });

    extraction.directiveDefs.forEach(def => {
      const directive = typeFromAST(def) as GraphQLDirective;
      directiveMap[directive.name] = directive;
    });

    if (extraction.extensionDefs.length > 0) {
      extensions.push({
        ...document,
        definitions: extraction.extensionDefs,
      });
    }
  }

  types.forEach(type => addTypeCandidate(typeCandidates, type.name, { type }));

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

export function buildTypes({
  typeCandidates,
  directives,
  stitchingInfo,
  operationTypeNames,
  onTypeConflict,
  mergeTypes,
  typeMergingOptions,
}: {
  typeCandidates: Record<string, Array<MergeTypeCandidate>>;
  directives: Array<GraphQLDirective>;
  stitchingInfo: StitchingInfo;
  operationTypeNames: Record<string, any>;
  onTypeConflict: OnTypeConflict;
  mergeTypes: boolean | Array<string> | MergeTypeFilter;
  typeMergingOptions: TypeMergingOptions;
}): { typeMap: TypeMap; directives: Array<GraphQLDirective> } {
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

  return rewireTypes(typeMap, directives);
}

function onTypeConflictToCandidateSelector(onTypeConflict: OnTypeConflict): CandidateSelector {
  return cands =>
    cands.reduce((prev, next) => {
      const type = onTypeConflict(prev.type, next.type, {
        left: {
          subschema: prev.subschema,
          transformedSubschema: prev.transformedSubschema,
        },
        right: {
          subschema: prev.subschema,
          transformedSubschema: prev.transformedSubschema,
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
