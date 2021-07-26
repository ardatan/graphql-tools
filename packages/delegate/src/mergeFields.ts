import {
  FieldNode,
  SelectionNode,
  Kind,
  GraphQLResolveInfo,
  SelectionSetNode,
  GraphQLObjectType,
  responsePathAsArray,
  getNamedType,
} from 'graphql';

import { ExternalObject, MergedTypeInfo } from './types';
import { memoize4, memoize3, memoize2 } from './memoize';
import { mergeExternalObjects } from './externalObjects';
import { Subschema } from './Subschema';

const sortSubschemasByProxiability = memoize4(function sortSubschemasByProxiability(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemaOrSourceSubschemas: Subschema | Array<Subschema>,
  targetSubschemas: Array<Subschema>,
  fieldNodes: Array<FieldNode>
): {
  proxiableSubschemas: Array<Subschema>;
  nonProxiableSubschemas: Array<Subschema>;
} {
  // 1.  calculate if possible to delegate to given subschema

  const proxiableSubschemas: Array<Subschema> = [];
  const nonProxiableSubschemas: Array<Subschema> = [];

  for (const t of targetSubschemas) {
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
  }

  return {
    proxiableSubschemas,
    nonProxiableSubschemas,
  };
});

const buildDelegationPlan = memoize3(function buildDelegationPlan(
  mergedTypeInfo: MergedTypeInfo,
  fieldNodes: Array<FieldNode>,
  proxiableSubschemas: Array<Subschema>
): {
  delegationMap: Map<Subschema, SelectionSetNode>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const { uniqueFields, nonUniqueFields } = mergedTypeInfo;
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
    unproxiableFieldNodes,
  };
});

const combineSubschemas = memoize2(function combineSubschemas(
  subschemaOrSubschemas: Subschema | Array<Subschema>,
  additionalSubschemas: Array<Subschema>
): Array<Subschema> {
  return Array.isArray(subschemaOrSubschemas)
    ? subschemaOrSubschemas.concat(additionalSubschemas)
    : [subschemaOrSubschemas].concat(additionalSubschemas);
});

export async function mergeFields(
  mergedTypeInfo: MergedTypeInfo,
  typeName: string,
  object$: Promise<any>,
  fieldNodes: Array<FieldNode>,
  sourceSubschemaOrSourceSubschemas: Subschema<any, any, any, any> | Array<Subschema<any, any, any, any>>,
  targetSubschemas: Array<Subschema<any, any, any, any>>,
  context: any,
  info: GraphQLResolveInfo
): Promise<any> {
  if (!fieldNodes.length) {
    return object$;
  }

  const { proxiableSubschemas, nonProxiableSubschemas } = sortSubschemasByProxiability(
    mergedTypeInfo,
    sourceSubschemaOrSourceSubschemas,
    targetSubschemas,
    fieldNodes
  );

  const { delegationMap, unproxiableFieldNodes } = buildDelegationPlan(mergedTypeInfo, fieldNodes, proxiableSubschemas);

  if (!delegationMap.size) {
    return object$;
  }

  const selectionSets: SelectionSetNode[] = [];
  const results: ExternalObject[] = [];
  await Promise.all(
    [...delegationMap.entries()].map(async ([s, selectionSet], i) => {
      const resolver = mergedTypeInfo.resolvers.get(s);
      if (resolver) {
        try {
          const object = await object$;
          results[i] = await resolver(await object, context, info, s, selectionSet);
        } catch (error) {
          results[i] = error;
        }
        selectionSets[i] = selectionSet;
      }
    })
  );

  return mergeFields(
    mergedTypeInfo,
    typeName,
    mergeExternalObjects(info.schema, responsePathAsArray(info.path), object$, results, selectionSets),
    unproxiableFieldNodes,
    combineSubschemas(sourceSubschemaOrSourceSubschemas, proxiableSubschemas),
    nonProxiableSubschemas,
    context,
    info
  );
}

const subschemaTypesContainSelectionSet = memoize3(function subschemaTypesContainSelectionSetMemoized(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemaOrSourceSubschemas: Subschema | Array<Subschema>,
  selectionSet: SelectionSetNode
) {
  if (Array.isArray(sourceSubschemaOrSourceSubschemas)) {
    return typesContainSelectionSet(
      sourceSubschemaOrSourceSubschemas.map(
        sourceSubschema => sourceSubschema.transformedSchema.getType(mergedTypeInfo.typeName) as GraphQLObjectType
      ),
      selectionSet
    );
  }

  return typesContainSelectionSet(
    [sourceSubschemaOrSourceSubschemas.transformedSchema.getType(mergedTypeInfo.typeName) as GraphQLObjectType],
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
