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
import { objectContainsInlineFragment } from '../utils';

export function mergeFields(
  mergedType: MergedTypeInfo,
  typeName: string,
  object: any,
  originalSelections: Array<FieldNode>,
  subschemas: Array<SubschemaConfig>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
): any {
  // 1. use fragment contained within the map and existing result to calculate
  //    if possible to delegate to given subschema

  const proxiableSubschemas: Array<SubschemaConfig> = [];
  const nonProxiableSubschemas: Array<SubschemaConfig>  = [];
  subschemas.forEach(s => {
    if (objectContainsInlineFragment(object, s.mergedTypeConfigs[typeName].parsedFragment)) {
      proxiableSubschemas.push(s);
    } else {
      nonProxiableSubschemas.push(s);
    }
  });

  // 3. use uniqueFields map to assign fields to subschema if one of possible subschemas

  const uniqueFields = mergedType.uniqueFields;
  const nonUniqueFields = mergedType.nonUniqueFields;
  const remainingSelections: Array<FieldNode> = [];

  const delegationMap: Map<SubschemaConfig, Array<SelectionNode>> = new Map();
  originalSelections.forEach(selection => {
    const uniqueSubschema: SubschemaConfig = uniqueFields[selection.name.value];
    if (uniqueSubschema && proxiableSubschemas.includes(uniqueSubschema)) {
      const selections = delegationMap.get(uniqueSubschema);
      if (selections) {
        selections.push(selection);
      } else {
        delegationMap.set(uniqueSubschema, [selection]);
      }
    } else {
      remainingSelections.push(selection);
    }
  });

  // 4. use nonUniqueFields to assign to a possible subschema,
  //    preferring one of the subschemas already targets of delegation

  const unproxiableSelections: Array<FieldNode> = [];
  remainingSelections.forEach(selection => {
    let nonUniqueSubschemas: Array<SubschemaConfig> = nonUniqueFields[selection.name.value];
    nonUniqueSubschemas = nonUniqueSubschemas.filter(s => proxiableSubschemas.includes(s));
    if (nonUniqueSubschemas) {
      const existingSelections = nonUniqueSubschemas.map(s => delegationMap.get(s)).find(selections => selections);
      if (existingSelections) {
        existingSelections.push(selection);
      } else {
        delegationMap.set(nonUniqueSubschemas[0], [selection]);
      }
    } else {
      unproxiableSelections.push(selection);
    }
  });

  // 5. terminate if no delegations actually possible.

  if (!delegationMap.size) {
    return object;
  }

  // 6. delegate!

  const maybePromises: Promise<any> | any = [];
  delegationMap.forEach((selections: Array<SelectionNode>, s: SubschemaConfig) => {
    const newFieldNodes = [{
      ...info.fieldNodes[0],
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections,
      }
    }];
    const maybePromise = s.mergedTypeConfigs[typeName].merge(
      object,
      context,
      info,
      s,
      newFieldNodes,
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

  // 7. repeat if necessary

  const mergeRemaining = (o: any) => {
    if (unproxiableSelections) {
      return mergeFields(
        mergedType,
        typeName,
        o,
        unproxiableSelections,
        nonProxiableSubschemas,
        context,
        info
      );
    } else {
      return o;
    }
  };

  if (containsPromises) {
    return Promise.all(maybePromises).
      then(results => mergeRemaining(mergeProxiedResults(object, ...results)));
  } else {
    return mergeRemaining(mergeProxiedResults(object, ...maybePromises));
  }
}
