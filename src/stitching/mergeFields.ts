import {
  FieldNode,
  SelectionNode,
  Kind,
} from 'graphql';
import {
  SubschemaConfig,
  IGraphQLToolsResolveInfo,
  MergedTypeInfo,
} from '../Interfaces';
import { mergeProxiedResults } from './proxiedResult';

function buildDelegationPlan(
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
  originalSelections: Array<FieldNode>,
  sourceSubschemas: Array<SubschemaConfig>,
  targetSubschemas: Array<SubschemaConfig>,
): {
  delegationMap: Map<SubschemaConfig, Array<SelectionNode>>,
  unproxiableSelections: Array<FieldNode>,
  proxiableSubschemas: Array<SubschemaConfig>,
  nonProxiableSubschemas: Array<SubschemaConfig>,
} {
  // 1.  calculate if possible to delegate to given subschema
  //    TODO: change logic so that required selection set can be spread across multiple subschemas?

  const proxiableSubschemas: Array<SubschemaConfig> = [];
  const nonProxiableSubschemas: Array<SubschemaConfig> = [];

  targetSubschemas.forEach(t => {
    if (sourceSubschemas.some(s => {
      const selectionSet = mergedTypeInfo.selectionSets.get(t);
      return mergedTypeInfo.containsSelectionSet.get(s).get(selectionSet);
    }
    )) {
      proxiableSubschemas.push(t);
    } else {
      nonProxiableSubschemas.push(t);
    }
  });

  const { uniqueFields, nonUniqueFields } = mergedTypeInfo;
  const unproxiableSelections: Array<FieldNode> = [];

  // 2. for each selection:

  const delegationMap: Map<SubschemaConfig, Array<SelectionNode>> = new Map();
  originalSelections.forEach(selection => {

    // 2a. use uniqueFields map to assign fields to subschema if one of possible subschemas

    const uniqueSubschema: SubschemaConfig = uniqueFields[selection.name.value];
    if (uniqueSubschema) {
      if (proxiableSubschemas.includes(uniqueSubschema)) {
        const existingSubschema = delegationMap.get(uniqueSubschema);
        if (existingSubschema) {
          existingSubschema.push(selection);
        } else {
          delegationMap.set(uniqueSubschema, [selection]);
        }
      } else {
        unproxiableSelections.push(selection);
      }

    } else {

      // 2b. use nonUniqueFields to assign to a possible subschema,
      //     preferring one of the subschemas already targets of delegation

      let nonUniqueSubschemas: Array<SubschemaConfig> = nonUniqueFields[selection.name.value];
      nonUniqueSubschemas = nonUniqueSubschemas.filter(s => proxiableSubschemas.includes(s));
      if (nonUniqueSubschemas) {
        const subschemas: Array<SubschemaConfig> = Array.from(delegationMap.keys());
        const existingSubschema = nonUniqueSubschemas.find(s => subschemas.includes(s));
        if (existingSubschema) {
          delegationMap.get(existingSubschema).push(selection);
        } else {
          delegationMap.set(nonUniqueSubschemas[0], [selection]);
        }
      } else {
        unproxiableSelections.push(selection);
      }
    }
  });

  return {
    delegationMap,
    unproxiableSelections,
    proxiableSubschemas,
    nonProxiableSubschemas,
  };
}

export function mergeFields(
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
  object: any,
  originalSelections: Array<FieldNode>,
  sourceSubschemas: Array<SubschemaConfig>,
  targetSubschemas: Array<SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
): any {

  if (!originalSelections.length) {
    return object;
  }

  const {
    delegationMap,
    unproxiableSelections,
    proxiableSubschemas,
    nonProxiableSubschemas,
  } = buildDelegationPlan(mergedTypeInfo, typeName, originalSelections, sourceSubschemas, targetSubschemas);

  if (!delegationMap.size) {
    return object;
  }

  const maybePromises: Promise<any> | any = [];
  delegationMap.forEach((selections: Array<SelectionNode>, s: SubschemaConfig) => {
    const maybePromise = s.mergedTypeConfigs[typeName].merge(
      object,
      context,
      info,
      s,
      {
        kind: Kind.SELECTION_SET,
        selections,
      },
    );
    maybePromises.push(maybePromise);
  });

  let containsPromises = false;
  for (const maybePromise of maybePromises) {
    if (maybePromise instanceof Promise) {
      containsPromises = true;
      break;
    }
  }

  return containsPromises ?
    Promise.all(maybePromises).
      then(results => mergeFields(
        mergedTypeInfo,
        typeName,
        mergeProxiedResults(object, ...results),
        unproxiableSelections,
        sourceSubschemas.concat(proxiableSubschemas),
        nonProxiableSubschemas,
        context,
        info,
      )) :
    mergeFields(
      mergedTypeInfo,
      typeName,
      mergeProxiedResults(object, ...maybePromises),
      unproxiableSelections,
      sourceSubschemas.concat(proxiableSubschemas),
      nonProxiableSubschemas,
      context,
      info,
    );
}
