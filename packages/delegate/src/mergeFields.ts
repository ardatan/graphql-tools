import { FieldNode, SelectionNode, Kind, GraphQLResolveInfo, SelectionSetNode } from 'graphql';

import { mergeProxiedResults } from './proxiedResult';
import { MergedTypeInfo, SubschemaConfig } from './types';
import { memoize4 } from './memoize';

const buildDelegationPlan = memoize4(function (
  mergedTypeInfo: MergedTypeInfo,
  fieldNodes: Array<FieldNode>,
  sourceSubschemas: Array<SubschemaConfig>,
  targetSubschemas: Array<SubschemaConfig>
): {
  delegationMap: Map<SubschemaConfig, SelectionSetNode>;
  unproxiableFieldNodes: Array<FieldNode>;
  proxiableSubschemas: Array<SubschemaConfig>;
  nonProxiableSubschemas: Array<SubschemaConfig>;
} {
  // 1.  calculate if possible to delegate to given subschema
  //    TODO: change logic so that required selection set can be spread across multiple subschemas?

  const proxiableSubschemas: Array<SubschemaConfig> = [];
  const nonProxiableSubschemas: Array<SubschemaConfig> = [];

  targetSubschemas.forEach(t => {
    if (
      sourceSubschemas.some(s => {
        const selectionSet = mergedTypeInfo.selectionSets.get(t);
        return mergedTypeInfo.containsSelectionSet.get(s).get(selectionSet);
      })
    ) {
      proxiableSubschemas.push(t);
    } else {
      nonProxiableSubschemas.push(t);
    }
  });

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
    proxiableSubschemas,
    nonProxiableSubschemas,
  };
});

export function mergeFields(
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
  object: any,
  fieldNodes: Array<FieldNode>,
  sourceSubschemas: Array<SubschemaConfig>,
  targetSubschemas: Array<SubschemaConfig>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  if (!fieldNodes.length) {
    return object;
  }

  const { delegationMap, unproxiableFieldNodes, proxiableSubschemas, nonProxiableSubschemas } = buildDelegationPlan(
    mergedTypeInfo,
    fieldNodes,
    sourceSubschemas,
    targetSubschemas
  );

  if (!delegationMap.size) {
    return object;
  }

  let containsPromises = false;
  const maybePromises: Promise<any> | any = [];
  delegationMap.forEach((selectionSet: SelectionSetNode, s: SubschemaConfig) => {
    const maybePromise = s.merge[typeName].resolve(object, context, info, s, selectionSet);
    maybePromises.push(maybePromise);
    if (!containsPromises && maybePromise instanceof Promise) {
      containsPromises = true;
    }
  });

  return containsPromises
    ? Promise.all(maybePromises).then(results =>
        mergeFields(
          mergedTypeInfo,
          typeName,
          mergeProxiedResults(object, ...results),
          unproxiableFieldNodes,
          sourceSubschemas.concat(proxiableSubschemas),
          nonProxiableSubschemas,
          context,
          info
        )
      )
    : mergeFields(
        mergedTypeInfo,
        typeName,
        mergeProxiedResults(object, ...maybePromises),
        unproxiableFieldNodes,
        sourceSubschemas.concat(proxiableSubschemas),
        nonProxiableSubschemas,
        context,
        info
      );
}
