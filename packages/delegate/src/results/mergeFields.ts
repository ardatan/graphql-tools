import {
  FieldNode,
  SelectionNode,
  Kind,
  GraphQLResolveInfo,
  SelectionSetNode,
  GraphQLObjectType,
  responsePathAsArray,
} from 'graphql';

import isPromise from 'is-promise';

import { typesContainSelectionSet } from '@graphql-tools/utils';

import { MergedTypeInfo, SubschemaConfig } from '../types';
import { memoize4, memoize3, memoize2 } from '../memoize';
import { mergeExternalData } from '../externalData';

const sortSubschemasByProxiability = memoize4(function (
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemaOrSourceSubschemas: SubschemaConfig | Array<SubschemaConfig>,
  targetSubschemas: Array<SubschemaConfig>,
  fieldNodes: Array<FieldNode>
): {
  proxiableSubschemas: Array<SubschemaConfig>;
  nonProxiableSubschemas: Array<SubschemaConfig>;
} {
  // 1.  calculate if possible to delegate to given subschema

  const proxiableSubschemas: Array<SubschemaConfig> = [];
  const nonProxiableSubschemas: Array<SubschemaConfig> = [];

  targetSubschemas.forEach(t => {
    const selectionSet = mergedTypeInfo.selectionSets.get(t);
    const fieldSelectionSets = mergedTypeInfo.fieldSelectionSets.get(t);
    if (
      selectionSet != null &&
      !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemaOrSourceSubschemas, selectionSet)
    ) {
      nonProxiableSubschemas.push(t);
    } else {
      if (
        fieldSelectionSets == null ||
        fieldNodes.every(fieldNode => {
          const fieldName = fieldNode.name.value;
          const fieldSelectionSet = fieldSelectionSets[fieldName];
          return (
            fieldSelectionSet == null ||
            subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemaOrSourceSubschemas, fieldSelectionSet)
          );
        })
      ) {
        proxiableSubschemas.push(t);
      } else {
        nonProxiableSubschemas.push(t);
      }
    }
  });

  return {
    proxiableSubschemas,
    nonProxiableSubschemas,
  };
});

const buildDelegationPlan = memoize3(function (
  mergedTypeInfo: MergedTypeInfo,
  fieldNodes: Array<FieldNode>,
  proxiableSubschemas: Array<SubschemaConfig>
): {
  delegationMap: Map<SubschemaConfig, SelectionSetNode>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const { uniqueFields, nonUniqueFields } = mergedTypeInfo;
  const unproxiableFieldNodes: Array<FieldNode> = [];

  // 2. for each selection:

  const delegationMap: Map<SubschemaConfig, Array<SelectionNode>> = new Map();
  fieldNodes.forEach(fieldNode => {
    if (fieldNode.name.value === '__typename') {
      return;
    }

    // 2a. use uniqueFields map to assign fields to subschema if one of possible subschemas

    const uniqueSubschema: SubschemaConfig = uniqueFields[fieldNode.name.value];
    if (uniqueSubschema != null) {
      if (!proxiableSubschemas.includes(uniqueSubschema)) {
        unproxiableFieldNodes.push(fieldNode);
        return;
      }

      const existingSubschema = delegationMap.get(uniqueSubschema);
      if (existingSubschema != null) {
        existingSubschema.push(fieldNode);
      } else {
        delegationMap.set(uniqueSubschema, [fieldNode]);
      }

      return;
    }

    // 2b. use nonUniqueFields to assign to a possible subschema,
    //     preferring one of the subschemas already targets of delegation

    let nonUniqueSubschemas: Array<SubschemaConfig> = nonUniqueFields[fieldNode.name.value];
    if (nonUniqueSubschemas == null) {
      unproxiableFieldNodes.push(fieldNode);
      return;
    }

    nonUniqueSubschemas = nonUniqueSubschemas.filter(s => proxiableSubschemas.includes(s));
    if (nonUniqueSubschemas == null) {
      unproxiableFieldNodes.push(fieldNode);
      return;
    }

    const subschemas: Array<SubschemaConfig> = Array.from(delegationMap.keys());
    const existingSubschema = nonUniqueSubschemas.find(s => subschemas.includes(s));
    if (existingSubschema != null) {
      delegationMap.get(existingSubschema).push(fieldNode);
    } else {
      delegationMap.set(nonUniqueSubschemas[0], [fieldNode]);
    }
  });

  const finalDelegationMap: Map<SubschemaConfig, SelectionSetNode> = new Map();

  delegationMap.forEach((selections, subschema) => {
    finalDelegationMap.set(subschema, {
      kind: Kind.SELECTION_SET,
      selections,
    });
  });

  return {
    delegationMap: finalDelegationMap,
    unproxiableFieldNodes,
  };
});

const combineSubschemas = memoize2(function (
  subschemaOrSubschemas: SubschemaConfig | Array<SubschemaConfig>,
  additionalSubschemas: Array<SubschemaConfig>
): Array<SubschemaConfig> {
  return Array.isArray(subschemaOrSubschemas)
    ? subschemaOrSubschemas.concat(additionalSubschemas)
    : [subschemaOrSubschemas].concat(additionalSubschemas);
});

export function mergeFields(
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
  object: any,
  fieldNodes: Array<FieldNode>,
  sourceSubschemaOrSourceSubschemas: SubschemaConfig | Array<SubschemaConfig>,
  targetSubschemas: Array<SubschemaConfig>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  if (!fieldNodes.length) {
    return object;
  }

  const { proxiableSubschemas, nonProxiableSubschemas } = sortSubschemasByProxiability(
    mergedTypeInfo,
    sourceSubschemaOrSourceSubschemas,
    targetSubschemas,
    fieldNodes
  );

  const { delegationMap, unproxiableFieldNodes } = buildDelegationPlan(mergedTypeInfo, fieldNodes, proxiableSubschemas);

  if (!delegationMap.size) {
    return object;
  }

  let containsPromises = false;
  const resultMap: Map<Promise<any> | any, SelectionSetNode> = new Map();
  delegationMap.forEach((selectionSet: SelectionSetNode, s: SubschemaConfig) => {
    const maybePromise = s.merge[typeName].resolve(object, context, info, s, selectionSet);
    resultMap.set(maybePromise, selectionSet);
    if (isPromise(maybePromise)) {
      containsPromises = true;
    }
  });

  return containsPromises
    ? Promise.all(resultMap.keys()).then(results =>
        mergeFields(
          mergedTypeInfo,
          typeName,
          mergeExternalData(
            info.schema,
            responsePathAsArray(info.path),
            object.__typename,
            object,
            results,
            Array.from(resultMap.values())
          ),
          unproxiableFieldNodes,
          combineSubschemas(sourceSubschemaOrSourceSubschemas, proxiableSubschemas),
          nonProxiableSubschemas,
          context,
          info
        )
      )
    : mergeFields(
        mergedTypeInfo,
        typeName,
        mergeExternalData(
          info.schema,
          responsePathAsArray(info.path),
          object.__typename,
          object,
          Array.from(resultMap.keys()),
          Array.from(resultMap.values())
        ),
        unproxiableFieldNodes,
        combineSubschemas(sourceSubschemaOrSourceSubschemas, proxiableSubschemas),
        nonProxiableSubschemas,
        context,
        info
      );
}

const subschemaTypesContainSelectionSet = memoize3(function (
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemaOrSourceSubschemas: SubschemaConfig | Array<SubschemaConfig>,
  selectionSet: SelectionSetNode
) {
  if (Array.isArray(sourceSubschemaOrSourceSubschemas)) {
    return typesContainSelectionSet(
      sourceSubschemaOrSourceSubschemas.map(
        sourceSubschema => sourceSubschema.schema.getType(mergedTypeInfo.typeName) as GraphQLObjectType
      ),
      selectionSet
    );
  }

  return typesContainSelectionSet(
    [sourceSubschemaOrSourceSubschemas.schema.getType(mergedTypeInfo.typeName) as GraphQLObjectType],
    selectionSet
  );
});
