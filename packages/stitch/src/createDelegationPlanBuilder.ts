import {
  FieldNode,
  SelectionNode,
  Kind,
  SelectionSetNode,
  GraphQLObjectType,
  getNamedType,
  GraphQLSchema,
  FragmentDefinitionNode,
} from 'graphql';

import { DelegationPlanBuilder, MergedTypeInfo, StitchingInfo, Subschema } from '@graphql-tools/delegate';

import { getFieldsNotInSubschema } from './getFieldsNotInSubschema.js';
import { memoize1, memoize2, memoize3, memoize5 } from '@graphql-tools/utils';

function calculateDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemas: Array<Subschema>,
  targetSubschemas: Array<Subschema>,
  fieldNodes: Array<FieldNode>
): {
  delegationMap: Map<Subschema, SelectionSetNode>;
  proxiableSubschemas: Array<Subschema>;
  nonProxiableSubschemas: Array<Subschema>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const { selectionSets, fieldSelectionSets, uniqueFields, nonUniqueFields } = mergedTypeInfo;

  // 1.  calculate if possible to delegate to given subschema

  const proxiableSubschemas: Array<Subschema> = [];
  const nonProxiableSubschemas: Array<Subschema> = [];

  for (const t of targetSubschemas) {
    const selectionSet = selectionSets.get(t);
    const fieldSelectionSetsMap = fieldSelectionSets.get(t);
    if (selectionSet != null && !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, selectionSet)) {
      nonProxiableSubschemas.push(t);
    } else {
      if (
        fieldSelectionSetsMap == null ||
        fieldNodes.every(fieldNode => {
          const fieldName = fieldNode.name.value;
          const fieldSelectionSet = fieldSelectionSetsMap[fieldName];
          return (
            fieldSelectionSet == null ||
            subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, fieldSelectionSet)
          );
        })
      ) {
        proxiableSubschemas.push(t);
      } else {
        nonProxiableSubschemas.push(t);
      }
    }
  }

  const unproxiableFieldNodes: Array<FieldNode> = [];

  // 2. for each selection:

  const delegationMap: Map<Subschema, SelectionSetNode> = new Map();
  for (const fieldNode of fieldNodes) {
    if (fieldNode.name.value === '__typename') {
      continue;
    }

    // 2a. use uniqueFields map to assign fields to subschema if one of possible subschemas

    const uniqueSubschema: Subschema = uniqueFields[fieldNode.name.value];
    if (uniqueSubschema != null) {
      if (!proxiableSubschemas.includes(uniqueSubschema)) {
        unproxiableFieldNodes.push(fieldNode);
        continue;
      }

      const existingSubschema = delegationMap.get(uniqueSubschema)?.selections as SelectionNode[];
      if (existingSubschema != null) {
        existingSubschema.push(fieldNode);
      } else {
        delegationMap.set(uniqueSubschema, {
          kind: Kind.SELECTION_SET,
          selections: [fieldNode],
        });
      }

      continue;
    }

    // 2b. use nonUniqueFields to assign to a possible subschema,
    //     preferring one of the subschemas already targets of delegation

    let nonUniqueSubschemas: Array<Subschema> = nonUniqueFields[fieldNode.name.value];
    if (nonUniqueSubschemas == null) {
      unproxiableFieldNodes.push(fieldNode);
      continue;
    }

    nonUniqueSubschemas = nonUniqueSubschemas.filter(s => proxiableSubschemas.includes(s));
    if (!nonUniqueSubschemas.length) {
      unproxiableFieldNodes.push(fieldNode);
      continue;
    }

    const existingSubschema = nonUniqueSubschemas.find(s => delegationMap.has(s));
    if (existingSubschema != null) {
      // It is okay we previously explicitly check whether the map has the element.
      (delegationMap.get(existingSubschema)!.selections as SelectionNode[]).push(fieldNode);
    } else {
      delegationMap.set(nonUniqueSubschemas[0], {
        kind: Kind.SELECTION_SET,
        selections: [fieldNode],
      });
    }
  }

  return {
    delegationMap,
    proxiableSubschemas,
    nonProxiableSubschemas,
    unproxiableFieldNodes,
  };
}

function getStitchingInfo(schema: GraphQLSchema): StitchingInfo {
  const stitchingInfo = schema.extensions?.['stitchingInfo'] as StitchingInfo | undefined;
  if (!stitchingInfo) {
    throw new Error(`Schema is not a stitched schema.`);
  }
  return stitchingInfo;
}

export function createDelegationPlanBuilder(mergedTypeInfo: MergedTypeInfo): DelegationPlanBuilder {
  return memoize5(function delegationPlanBuilder(
    schema: GraphQLSchema,
    sourceSubschema: Subschema<any, any, any, any>,
    variableValues: Record<string, any>,
    fragments: Record<string, FragmentDefinitionNode>,
    fieldNodes: FieldNode[]
  ): Array<Map<Subschema, SelectionSetNode>> {
    const stitchingInfo = getStitchingInfo(schema);
    const targetSubschemas = mergedTypeInfo?.targetSubschemas.get(sourceSubschema);
    if (!targetSubschemas || !targetSubschemas.length) {
      return [];
    }

    const typeName = mergedTypeInfo.typeName;
    const fieldsNotInSubschema = getFieldsNotInSubschema(
      schema,
      stitchingInfo,
      schema.getType(typeName) as GraphQLObjectType,
      mergedTypeInfo.typeMaps.get(sourceSubschema)?.[typeName] as GraphQLObjectType,
      fieldNodes,
      fragments,
      variableValues
    );

    if (!fieldsNotInSubschema.length) {
      return [];
    }

    const delegationMaps: Array<Map<Subschema, SelectionSetNode>> = [];
    let sourceSubschemas = createSubschemas(sourceSubschema);

    let delegationStage = calculateDelegationStage(
      mergedTypeInfo,
      sourceSubschemas,
      targetSubschemas,
      fieldsNotInSubschema
    );
    let { delegationMap } = delegationStage;
    while (delegationMap.size) {
      delegationMaps.push(delegationMap);

      const { proxiableSubschemas, nonProxiableSubschemas, unproxiableFieldNodes } = delegationStage;

      sourceSubschemas = combineSubschemas(sourceSubschemas, proxiableSubschemas);

      delegationStage = calculateDelegationStage(
        mergedTypeInfo,
        sourceSubschemas,
        nonProxiableSubschemas,
        unproxiableFieldNodes
      );
      delegationMap = delegationStage.delegationMap;
    }

    return delegationMaps;
  });
}

const createSubschemas = memoize1(function createSubschemas(sourceSubschema: Subschema): Array<Subschema> {
  return [sourceSubschema];
});

const combineSubschemas = memoize2(function combineSubschemas(
  sourceSubschemas: Array<Subschema>,
  additionalSubschemas: Array<Subschema>
): Array<Subschema> {
  return sourceSubschemas.concat(additionalSubschemas);
});

const subschemaTypesContainSelectionSet = memoize3(function subschemaTypesContainSelectionSet(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubchemas: Array<Subschema>,
  selectionSet: SelectionSetNode
) {
  return typesContainSelectionSet(
    sourceSubchemas.map(
      sourceSubschema => sourceSubschema.transformedSchema.getType(mergedTypeInfo.typeName) as GraphQLObjectType
    ),
    selectionSet
  );
});

function typesContainSelectionSet(types: Array<GraphQLObjectType>, selectionSet: SelectionSetNode): boolean {
  const fieldMaps = types.map(type => type.getFields());

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const fields = fieldMaps.map(fieldMap => fieldMap[selection.name.value]).filter(field => field != null);
      if (!fields.length) {
        return false;
      }

      if (selection.selectionSet != null) {
        return typesContainSelectionSet(
          fields.map(field => getNamedType(field.type)) as Array<GraphQLObjectType>,
          selection.selectionSet
        );
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT && selection.typeCondition?.name.value === types[0].name) {
      return typesContainSelectionSet(types, selection.selectionSet);
    }
  }

  return true;
}
