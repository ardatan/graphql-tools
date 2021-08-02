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
} from 'graphql';
import { collectFields, ExecutionContext } from 'graphql/execution/execute';

import DataLoader from 'dataloader';

import nanomemoize from 'nano-memoize';

import { getResponseKeyFromInfo, Maybe, relocatedError } from '@graphql-tools/utils';

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

const loaders: WeakMap<any, DataLoader<GraphQLResolveInfo, Promise<ExternalObject>>> = new WeakMap();

export async function getMergedParent(
  parent: ExternalObject,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): Promise<ExternalObject> {
  let loader = loaders.get(parent);
  if (loader === undefined) {
    loader = new DataLoader(infos => getMergedParentsFromInfos(parent, context, infos));
    loaders.set(parent, loader);
  }
  return loader.load(info);
}

async function getMergedParentsFromInfos(
  parent: ExternalObject,
  context: Record<string, any>,
  infos: ReadonlyArray<GraphQLResolveInfo>
): Promise<Array<Promise<ExternalObject>>> {
  const parentInfo = getInfo(parent);

  const schema = parentInfo.schema;
  const stitchingInfo: Maybe<StitchingInfo> = schema.extensions?.['stitchingInfo'];
  if (stitchingInfo == null) {
    return infos.map(() => Promise.resolve(parent));
  }

  const parentTypeName = infos[0].parentType.name;
  const mergedTypeInfo = stitchingInfo.mergedTypes[parentTypeName];
  if (mergedTypeInfo === undefined) {
    return infos.map(() => Promise.resolve(parent));
  }

  // In the stitching context, all subschemas are compiled Subschema objects rather than SubschemaConfig objects
  const sourceSubschema = getObjectSubchema(parent) as Subschema;
  const targetSubschemas = mergedTypeInfo.targetSubschemas.get(sourceSubschema);
  if (targetSubschemas === undefined || targetSubschemas.length === 0) {
    return infos.map(() => Promise.resolve(parent));
  }

  const sourceSubschemaParentType = sourceSubschema.transformedSchema.getType(parentTypeName) as GraphQLObjectType;
  const sourceSubschemaFields = sourceSubschemaParentType.getFields();
  const subschemaFields = mergedTypeInfo.subschemaFields;
  const keyResponseKeys: Record<string, Set<string>> = Object.create(null);
  const typeFieldNodes = stitchingInfo.fieldNodesByField?.[parentTypeName];
  const typeDynamicSelectionSets = stitchingInfo?.dynamicSelectionSetsByField?.[parentTypeName];

  const fieldNodes = new Set<FieldNode>();

  const fieldNodesByType = stitchingInfo.fieldNodesByType?.[parentTypeName];
  if (fieldNodesByType !== undefined) {
    for (const fieldNode of fieldNodesByType) {
      const fieldName = fieldNode.name.value;
      if (!sourceSubschemaFields[fieldName]) {
        const fieldName = fieldNode.name.value;
        if (!sourceSubschemaFields[fieldName]) {
          fieldNodes.add(fieldNode);
        }
      }
    }
  }

  for (const info of infos) {
    const responseKey = getResponseKeyFromInfo(info);
    const fieldName = info.fieldName;
    if (subschemaFields[fieldName] !== undefined) {
      // merged subschema field
      for (const fieldNode of info.fieldNodes) {
        const fieldName = fieldNode.name.value;
        if (!sourceSubschemaFields[fieldName]) {
          fieldNodes.add(fieldNode);
        }
      }
    } else {
      // gateway field
      if (keyResponseKeys[responseKey] === undefined) {
        keyResponseKeys[responseKey] = new Set();
      }
    }

    const keyFieldNodes = new Set<FieldNode>();

    const fieldNodesByField = typeFieldNodes?.[fieldName];
    if (fieldNodesByField !== undefined) {
      for (const fieldNode of fieldNodesByField) {
        keyFieldNodes.add(fieldNode);
      }
    }

    const dynamicSelectionSets = typeDynamicSelectionSets?.[fieldName];
    if (dynamicSelectionSets !== undefined) {
      for (const fieldNode of info.fieldNodes) {
        for (const dynamicSelectionSet of dynamicSelectionSets) {
          const responseMap = collectFields(
            parentInfo as unknown as ExecutionContext,
            sourceSubschemaParentType,
            dynamicSelectionSet(fieldNode),
            {},
            {}
          );
          for (const responseKey in responseMap) {
            for (const fieldNode of responseMap[responseKey]) {
              keyFieldNodes.add(fieldNode);
            }
          }
        }
      }
    }

    if (keyResponseKeys[responseKey] !== undefined) {
      for (const fieldNode of keyFieldNodes.values()) {
        const keyResponseKey = fieldNode.alias?.value ?? fieldNode.name.value;
        keyResponseKeys[responseKey].add(keyResponseKey);
      }
    }

    for (const fieldNode of keyFieldNodes) {
      fieldNodes.add(fieldNode);
    }
  }

  const mergedParents = getMergedParentsFromFieldNodes(
    mergedTypeInfo,
    parent,
    Array.from(fieldNodes),
    sourceSubschema,
    targetSubschemas,
    context,
    parentInfo
  );

  return infos.map(info => {
    const responseKey = getResponseKeyFromInfo(info);
    if (keyResponseKeys[responseKey] === undefined) {
      return mergedParents[responseKey];
    }

    const promises = Array.from(keyResponseKeys[responseKey].values()).map(
      keyResponseKey => mergedParents[keyResponseKey]
    );
    return Promise.all(promises).then(parents => parents[0]);
  });
}

const sortSubschemasByProxiability = nanomemoize(function sortSubschemasByProxiability(
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

const buildDelegationPlan = nanomemoize(function buildDelegationPlan(
  mergedTypeInfo: MergedTypeInfo,
  fieldNodes: Array<FieldNode>,
  proxiableSubschemas: Array<Subschema>
): {
  delegationMap: Map<Subschema, Array<FieldNode>>;
  unproxiableFieldNodes: Array<FieldNode>;
} {
  const { uniqueFields, nonUniqueFields } = mergedTypeInfo;
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
  }

  return {
    delegationMap,
    unproxiableFieldNodes,
  };
});

const combineSubschemas = nanomemoize(function combineSubschemas(
  subschemaOrSubschemas: Subschema | Array<Subschema>,
  additionalSubschemas: Array<Subschema>
): Array<Subschema> {
  return Array.isArray(subschemaOrSubschemas)
    ? subschemaOrSubschemas.concat(additionalSubschemas)
    : [subschemaOrSubschemas].concat(additionalSubschemas);
});

function getMergedParentsFromFieldNodes(
  mergedTypeInfo: MergedTypeInfo,
  object: any,
  fieldNodes: Array<FieldNode>,
  sourceSubschemaOrSourceSubschemas: Subschema | Array<Subschema>,
  targetSubschemas: Array<Subschema>,
  context: Record<string, any>,
  parentInfo: GraphQLResolveInfo
): Record<string, Promise<ExternalObject>> {
  if (!fieldNodes.length) {
    return Object.create(null);
  }

  const { proxiableSubschemas, nonProxiableSubschemas } = sortSubschemasByProxiability(
    mergedTypeInfo,
    sourceSubschemaOrSourceSubschemas,
    targetSubschemas,
    fieldNodes
  );

  const { delegationMap, unproxiableFieldNodes } = buildDelegationPlan(mergedTypeInfo, fieldNodes, proxiableSubschemas);

  if (!delegationMap.size) {
    const mergedParentMap = Object.create(null);
    for (const fieldNode of unproxiableFieldNodes) {
      const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
      mergedParentMap[responseKey] = Promise.resolve(object);
    }
    return mergedParentMap;
  }

  const schema = parentInfo.schema;
  const type = schema.getType(object.__typename) as GraphQLObjectType;
  const parentPath = responsePathAsArray(parentInfo.path);
  const initialPath = getInitialPath(object);
  const newSubschemaMap = getSubschemaMap(object);

  const unpathedErrors = getUnpathedErrors(object);

  const promises = Promise.all(
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
          const fieldNodes = collectFields(
            {
              schema,
              variableValues: {},
              fragments: {},
            } as ExecutionContext,
            type,
            selectionSet,
            Object.create(null),
            Object.create(null)
          );

          const nullResult = Object.create(null);
          if (source instanceof GraphQLError && source.path) {
            const basePath = parentPath.slice(initialPath.length);
            for (const responseKey in fieldNodes) {
              const tailPath =
                source.path.length === parentPath.length ? [responseKey] : source.path.slice(initialPath.length);
              const newPath = basePath.concat(tailPath);
              nullResult[responseKey] = relocatedError(source, newPath);
            }
          } else if (source instanceof Error) {
            const basePath = parentPath.slice(initialPath.length);
            for (const responseKey in fieldNodes) {
              const newPath = basePath.concat([responseKey]);
              nullResult[responseKey] = locatedError(source, fieldNodes[responseKey], newPath);
            }
          } else {
            for (const responseKey in fieldNodes) {
              nullResult[responseKey] = null;
            }
          }
          return nullResult;
        }

        if (!isExternalObject(source)) {
          return source;
        }

        const objectSubschema = getObjectSubchema(source);
        const subschemaMap = getSubschemaMap(source);
        for (const responseKey in source) {
          newSubschemaMap[responseKey] = subschemaMap?.[responseKey] ?? objectSubschema;
        }
        unpathedErrors.push(...getUnpathedErrors(source));

        return source;
      }
    })
  );

  const currentPromise = promises.then(sources => Object.assign(object, ...sources));

  const mergedParentMap = Object.create(null);
  for (const [, fieldNodes] of delegationMap) {
    for (const fieldNode of fieldNodes) {
      const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
      mergedParentMap[responseKey] = currentPromise;
    }
  }

  const nextPromise = currentPromise.then(() =>
    getMergedParentsFromFieldNodes(
      mergedTypeInfo,
      object,
      unproxiableFieldNodes,
      combineSubschemas(sourceSubschemaOrSourceSubschemas, proxiableSubschemas),
      nonProxiableSubschemas,
      context,
      parentInfo
    )
  );

  for (const fieldNode of unproxiableFieldNodes) {
    const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
    mergedParentMap[responseKey] = nextPromise.then(nextParent => nextParent[responseKey]);
  }

  return mergedParentMap;
}

const subschemaTypesContainSelectionSet = nanomemoize(function subschemaTypesContainSelectionSet(
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
