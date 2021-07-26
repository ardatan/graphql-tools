import {
  FieldNode,
  Kind,
  GraphQLResolveInfo,
  SelectionSetNode,
  GraphQLObjectType,
  getNamedType,
  responsePathAsArray,
  GraphQLError,
  locatedError,
  GraphQLSchema,
} from 'graphql';

import DataLoader from 'dataloader';

import { Maybe, collectFields, relocatedError, memoize1, memoize3, memoize4ofMany } from '@graphql-tools/utils';

import { ExternalObject, MergedTypeInfo, StitchingInfo } from './types';
import { Subschema } from './Subschema';
import {
  getInfo,
  getInitialPath,
  getObjectSubchema,
  getSubschemaMap,
  getUnpathedErrors,
  isExternalObject,
} from './externalObjects';

const getMergeDetails = memoize1(function getMergeDetails(info: GraphQLResolveInfo):
  | {
      stitchingInfo: StitchingInfo;
      mergedTypeInfo: MergedTypeInfo;
    }
  | undefined {
  const schema = info.schema;
  const stitchingInfo: Maybe<StitchingInfo> = schema.extensions?.['stitchingInfo'];
  if (stitchingInfo == null) {
    return;
  }

  const parentTypeName = info.parentType.name;
  const mergedTypeInfo = stitchingInfo.mergedTypes[parentTypeName];
  if (mergedTypeInfo === undefined) {
    return;
  }

  return {
    stitchingInfo,
    mergedTypeInfo,
  };
});

const loaders: WeakMap<any, DataLoader<GraphQLResolveInfo, Promise<ExternalObject>>> = new WeakMap();

export async function getMergedParent(
  parent: ExternalObject,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): Promise<ExternalObject> {
  const mergeDetails = getMergeDetails(info);
  if (!mergeDetails) {
    return parent;
  }

  const { mergedTypeInfo } = mergeDetails;

  // In the stitching context, all subschemas are compiled Subschema objects rather than SubschemaConfig objects
  const sourceSubschema = getObjectSubchema(parent) as Subschema;
  const targetSubschemas = mergedTypeInfo.targetSubschemas.get(sourceSubschema);
  if (targetSubschemas === undefined || targetSubschemas.length === 0) {
    return parent;
  }

  let loader = loaders.get(parent);
  if (loader === undefined) {
    loader = new DataLoader(infos =>
      getMergedParentsFromInfos(parent, context, infos, mergedTypeInfo, sourceSubschema)
    );
    loaders.set(parent, loader);
  }
  return loader.load(info);
}

async function getMergedParentsFromInfos(
  parent: ExternalObject,
  context: Record<string, any>,
  infos: ReadonlyArray<GraphQLResolveInfo>,
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschema: Subschema
): Promise<Array<Promise<ExternalObject>>> {
  const { requiredKeys, delegationMaps, stageMap } = buildDelegationPlan(
    mergedTypeInfo,
    infos[0].schema,
    sourceSubschema,
    ...infos.map(info => info.fieldNodes)
  );

  if (!delegationMaps.length) {
    return Array(infos.length).fill(parent);
  }

  const promises: Array<Promise<ExternalObject>> = [];
  const parentInfo = getInfo(parent);
  const schema = parentInfo.schema;
  const type = schema.getType(parent.__typename) as GraphQLObjectType;
  const parentPath = responsePathAsArray(parentInfo.path);
  let promise = executeDelegationStage(
    delegationMaps[0],
    schema,
    type,
    mergedTypeInfo,
    context,
    parent,
    parentInfo,
    parentPath
  ).then(() => parent);
  promises.push(promise);
  for (let i = 1, delegationStage = delegationMaps[i]; i < delegationMaps.length; i++) {
    promise = promise.then(parent =>
      executeDelegationStage(
        delegationStage,
        schema,
        type,
        mergedTypeInfo,
        context,
        parent,
        parentInfo,
        parentPath
      ).then(() => parent)
    );
    promises.push(promise);
  }

  return infos.map(info => {
    const keys = requiredKeys[info.fieldName];
    if (keys === undefined) {
      const delegationStage = stageMap[info.fieldName];
      if (delegationStage !== undefined) {
        return promises[delegationStage].then(() => parent);
      }
      return Promise.resolve(parent);
    }

    return Promise.all(
      Array.from(keys.values()).map(fieldName => {
        const delegationStage = stageMap[fieldName];
        if (delegationStage !== undefined) {
          return promises[delegationStage].then(() => parent);
        }
        return Promise.resolve(parent);
      })
    ).then(() => parent);
  });
}

function sortSubschemasByProxiability(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemas: Array<Subschema>,
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
    if (selectionSet != null && !subschemaTypesContainSelectionSet(mergedTypeInfo, sourceSubschemas, selectionSet)) {
      nonProxiableSubschemas.push(t);
    } else {
      if (
        fieldSelectionSets == null ||
        fieldNodes.every(fieldNode => {
          const fieldName = fieldNode.name.value;
          const fieldSelectionSet = fieldSelectionSets[fieldName];
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

  return {
    proxiableSubschemas,
    nonProxiableSubschemas,
  };
}

function calculateDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemas: Array<Subschema>,
  targetSubschemas: Array<Subschema>,
  fieldNodes: Array<FieldNode>
): {
  proxiableSubschemas: Array<Subschema>;
  nonProxiableSubschemas: Array<Subschema>;
  delegationMap: Map<Subschema, Array<FieldNode>>;
  proxiableFieldNodes: Array<FieldNode>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const { proxiableSubschemas, nonProxiableSubschemas } = sortSubschemasByProxiability(
    mergedTypeInfo,
    sourceSubschemas,
    targetSubschemas,
    fieldNodes
  );

  const { delegationMap, proxiableFieldNodes, unproxiableFieldNodes } = buildDelegationStage(
    mergedTypeInfo,
    fieldNodes,
    proxiableSubschemas
  );

  return {
    proxiableSubschemas,
    nonProxiableSubschemas,
    delegationMap,
    proxiableFieldNodes,
    unproxiableFieldNodes,
  };
}

export const buildDelegationPlan = memoize4ofMany(function buildDelegationPlan(
  mergedTypeInfo: MergedTypeInfo,
  schema: GraphQLSchema,
  sourceSubschema: Subschema,
  ...fieldNodeArrays: Array<ReadonlyArray<FieldNode>>
): {
  requiredKeys: Record<string, Set<string>>;
  delegationMaps: Array<Map<Subschema, Array<FieldNode>>>;
  stageMap: Record<string, number>;
} {
  const requiredKeys: Record<string, Set<string>> = Object.create(null);
  const delegationMaps: Array<Map<Subschema, Array<FieldNode>>> = [];
  const stageMap = Object.create(null);

  const stitchingInfo: Maybe<StitchingInfo> = schema.extensions?.['stitchingInfo'];
  if (stitchingInfo == null) {
    return { requiredKeys, delegationMaps, stageMap };
  }

  const targetSubschemas = mergedTypeInfo.targetSubschemas.get(sourceSubschema);
  if (targetSubschemas === undefined || targetSubschemas.length === 0) {
    return { requiredKeys, delegationMaps, stageMap };
  }

  const parentTypeName = mergedTypeInfo.typeName;
  const sourceSubschemaParentType = sourceSubschema.transformedSchema.getType(parentTypeName) as GraphQLObjectType;
  const sourceSubschemaFields = sourceSubschemaParentType.getFields();
  const subschemaFields = mergedTypeInfo.subschemaFields;
  const typeFieldNodes = stitchingInfo.fieldNodesByField?.[parentTypeName];

  const fieldNodeSet = new Set<FieldNode>();

  const fieldNodesByType = stitchingInfo.fieldNodesByType?.[parentTypeName];
  if (fieldNodesByType !== undefined) {
    for (const fieldNode of fieldNodesByType) {
      const fieldName = fieldNode.name.value;
      if (!sourceSubschemaFields[fieldName]) {
        const fieldName = fieldNode.name.value;
        if (!sourceSubschemaFields[fieldName]) {
          fieldNodeSet.add(fieldNode);
        }
      }
    }
  }

  for (const fieldNodeArray of fieldNodeArrays) {
    const fieldName = fieldNodeArray[0].name.value;
    if (subschemaFields[fieldName] !== undefined) {
      // merged subschema field
      for (const fieldNode of fieldNodeArray) {
        const fieldName = fieldNode.name.value;
        if (!sourceSubschemaFields[fieldName]) {
          fieldNodeSet.add(fieldNode);
        }
      }
    } else {
      // gateway field
      if (requiredKeys[fieldName] === undefined) {
        requiredKeys[fieldName] = new Set();
      }
    }

    const keyFieldNodes = new Set<FieldNode>();

    const fieldNodesByField = typeFieldNodes?.[fieldName];
    if (fieldNodesByField !== undefined) {
      for (const fieldNode of fieldNodesByField) {
        keyFieldNodes.add(fieldNode);
      }
    }

    if (requiredKeys[fieldName] !== undefined) {
      for (const fieldNode of keyFieldNodes.values()) {
        requiredKeys[fieldName].add(fieldNode.name.value);
      }
    }

    for (const fieldNode of keyFieldNodes) {
      fieldNodeSet.add(fieldNode);
    }
  }

  const fieldNodes = Array.from(fieldNodeSet);

  let sourceSubschemas = [sourceSubschema];
  let delegationStage = calculateDelegationStage(mergedTypeInfo, sourceSubschemas, targetSubschemas, fieldNodes);

  let stageIndex = 0;
  let delegationMap = delegationStage.delegationMap;
  while (delegationMap.size) {
    delegationMaps.push(delegationMap);

    const { proxiableSubschemas, nonProxiableSubschemas, proxiableFieldNodes, unproxiableFieldNodes } = delegationStage;

    sourceSubschemas = sourceSubschemas.concat(proxiableSubschemas);

    for (const fieldNode of proxiableFieldNodes) {
      stageMap[fieldNode.name.value] = stageIndex;
    }
    stageIndex++;

    delegationStage = calculateDelegationStage(
      mergedTypeInfo,
      sourceSubschemas,
      nonProxiableSubschemas,
      unproxiableFieldNodes
    );

    delegationMap = delegationStage.delegationMap;
  }

  return {
    requiredKeys,
    delegationMaps,
    stageMap,
  };
});

function buildDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  fieldNodes: Array<FieldNode>,
  proxiableSubschemas: Array<Subschema>
): {
  delegationMap: Map<Subschema, Array<FieldNode>>;
  proxiableFieldNodes: Array<FieldNode>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const { uniqueFields, nonUniqueFields } = mergedTypeInfo;
  const proxiableFieldNodes: Array<FieldNode> = [];
  const unproxiableFieldNodes: Array<FieldNode> = [];

  // 2. for each selection:

  const delegationMap: Map<Subschema, Array<FieldNode>> = new Map();
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

      const existingSubschema = delegationMap.get(uniqueSubschema);
      if (existingSubschema != null) {
        existingSubschema.push(fieldNode);
      } else {
        delegationMap.set(uniqueSubschema, [fieldNode]);
      }
      proxiableFieldNodes.push(fieldNode);

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
      (delegationMap.get(existingSubschema)! as Array<FieldNode>).push(fieldNode);
    } else {
      delegationMap.set(nonUniqueSubschemas[0], [fieldNode]);
    }
    proxiableFieldNodes.push(fieldNode);
  }

  return {
    delegationMap,
    proxiableFieldNodes,
    unproxiableFieldNodes,
  };
}

async function executeDelegationStage(
  delegationMap: Map<Subschema, Array<FieldNode>>,
  schema: GraphQLSchema,
  type: GraphQLObjectType,
  mergedTypeInfo: MergedTypeInfo,
  context: Record<string, any>,
  object: ExternalObject,
  parentInfo: GraphQLResolveInfo,
  parentPath: Array<string | number>
): Promise<void> {
  const initialPath = getInitialPath(object);
  const newSubschemaMap = getSubschemaMap(object);

  const unpathedErrors = getUnpathedErrors(object);

  await Promise.all(
    [...delegationMap.entries()].map(async ([s, fieldNodes]) => {
      const resolver = mergedTypeInfo.resolvers.get(s);
      if (resolver) {
        const selectionSet: SelectionSetNode = { kind: Kind.SELECTION_SET, selections: fieldNodes };
        let source: unknown;
        try {
          source = await resolver(object, context, parentInfo, s, selectionSet);
        } catch (error) {
          source = error;
        }

        if (source instanceof Error || source === null) {
          const fieldNodes = collectFields(schema, {}, {}, type, selectionSet, new Map(), new Set());

          const nullResult = Object.create(null);
          if (source instanceof GraphQLError && source.path) {
            const basePath = parentPath.slice(initialPath.length);
            for (const [responseKey] of fieldNodes) {
              const tailPath =
                source.path.length === parentPath.length ? [responseKey] : source.path.slice(initialPath.length);
              const newPath = basePath.concat(tailPath);
              nullResult[responseKey] = relocatedError(source, newPath);
            }
          } else if (source instanceof Error) {
            const basePath = parentPath.slice(initialPath.length);
            for (const [responseKey] of fieldNodes) {
              const newPath = basePath.concat([responseKey]);
              nullResult[responseKey] = locatedError(source, fieldNodes[responseKey], newPath);
            }
          } else {
            for (const [responseKey] of fieldNodes) {
              nullResult[responseKey] = null;
            }
          }
          source = nullResult;
        }

        // TODO: fold this assign into loop below?
        Object.assign(object, source);

        // TODO: is this check necessary or just to make TS happy?
        if (!isExternalObject(source)) {
          return;
        }

        const objectSubschema = getObjectSubchema(source);
        const subschemaMap = getSubschemaMap(source);
        for (const responseKey in source) {
          newSubschemaMap[responseKey] = subschemaMap?.[responseKey] ?? objectSubschema;
        }
        unpathedErrors.push(...getUnpathedErrors(source));
      }
    })
  );
}

const subschemaTypesContainSelectionSet = memoize3(function subschemaTypesContainSelectionSet(
  mergedTypeInfo: MergedTypeInfo,
  sourceSubschemas: Array<Subschema>,
  selectionSet: SelectionSetNode
) {
  return typesContainSelectionSet(
    sourceSubschemas.map(
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
