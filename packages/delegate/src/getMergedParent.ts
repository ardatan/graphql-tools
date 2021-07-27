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

import { Repeater } from '@repeaterjs/repeater';
import DataLoader from 'dataloader';
import isPromise from 'is-promise';

import { getResponseKeyFromInfo, Maybe, relocatedError } from '@graphql-tools/utils';

import { ExternalObject, MergedTypeInfo, StitchingInfo } from './types';
import { memoize4, memoize3, memoize2 } from './memoize';
import { Subschema } from './Subschema';
import { getInfo, getInitialPath, getObjectSubchema, getSubschemaMap, isExternalObject } from './externalObjects';

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

  infos.forEach(info => {
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
      info.fieldNodes.forEach(fieldNode => {
        dynamicSelectionSets.forEach(dynamicSelectionSet => {
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
        });
      });
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
  });

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

    // Set is never empty
    const responseKeys = Array.from(keyResponseKeys[responseKey].values()).map(
      keyResponseKey => mergedParents[keyResponseKey]
    ) as [Promise<ExternalObject>, ...Array<Promise<ExternalObject>>];
    return slowRace(responseKeys);
  });
}

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

const combineSubschemas = memoize2(function combineSubschemas(
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
    unproxiableFieldNodes.forEach(fieldNode => {
      const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
      mergedParentMap[responseKey] = Promise.resolve(object);
    });
    return mergedParentMap;
  }

  const resultMap: Map<Promise<any> | any, SelectionSetNode> = new Map();

  const mergedParentMap = Object.create(null);
  const schema = parentInfo.schema;
  const type = schema.getType(object.__typename) as GraphQLObjectType;
  const parentPath = responsePathAsArray(parentInfo.path);
  const initialPath = getInitialPath(object);
  const newSubschemaMap = getSubschemaMap(object);

  for (const [s, fieldNodes] of delegationMap) {
    const resolver = mergedTypeInfo.resolvers.get(s);
    if (resolver) {
      const selectionSet: SelectionSetNode = { kind: Kind.SELECTION_SET, selections: fieldNodes };
      let maybePromise = resolver(object, context, parentInfo, s, selectionSet);
      if (isPromise(maybePromise)) {
        maybePromise = maybePromise.then(undefined, error => error);
      }
      resultMap.set(maybePromise, selectionSet);

      const promise = Promise.resolve(maybePromise).then(result => {
        if (result instanceof Error || result === null) {
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

          if (result instanceof GraphQLError && result.path) {
            const basePath = parentPath.slice(initialPath.length);
            for (const responseKey in fieldNodes) {
              const tailPath =
                result.path.length === parentPath.length ? [responseKey] : result.path.slice(initialPath.length);
              const newPath = basePath.concat(tailPath);
              object[responseKey] = relocatedError(result, newPath);
            }
          } else if (object instanceof Error) {
            const basePath = parentPath.slice(initialPath.length);
            for (const responseKey in fieldNodes) {
              const newPath = basePath.concat([responseKey]);
              object[responseKey] = locatedError(result, fieldNodes[responseKey], newPath);
            }
          } else {
            for (const responseKey in fieldNodes) {
              object[responseKey] = null;
            }
          }
          return object;
        }

        Object.assign(object, result);

        if (!isExternalObject(result)) {
          return object;
        }

        const objectSubschema = getObjectSubchema(result);
        const subschemaMap = getSubschemaMap(result);
        for (const responseKey in result) {
          newSubschemaMap[responseKey] = subschemaMap?.[responseKey] ?? objectSubschema;
        }

        return object;
      });

      fieldNodes.forEach(fieldNode => {
        const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
        mergedParentMap[responseKey] = promise;
      });
    }
  }

  const nextPromise = Promise.all(resultMap.keys()).then(() =>
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

  unproxiableFieldNodes.forEach(fieldNode => {
    const responseKey = fieldNode.alias?.value ?? fieldNode.name.value;
    mergedParentMap[responseKey] = nextPromise.then(nextParent => nextParent[responseKey]);
  });

  return mergedParentMap;
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

async function slowRace<T extends unknown>(promises: [Promise<T>, ...Array<Promise<T>>]): Promise<T> {
  // if promises is non-empty, last will be defined
  let last!: T;
  for await (const result of Repeater.merge(promises)) {
    last = result;
  }
  return last;
}
