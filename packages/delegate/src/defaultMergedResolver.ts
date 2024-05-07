import {
  defaultFieldResolver,
  GraphQLResolveInfo,
  Kind,
  responsePathAsArray,
  SelectionSetNode,
} from 'graphql';
import { getResponseKeyFromInfo, isPromise } from '@graphql-tools/utils';
import { DelegationPlanLeftOver, getPlanLeftOverFromParent } from './leftOver.js';
import {
  getSubschema,
  getUnpathedErrors,
  handleResolverResult,
  isExternalObject,
} from './mergeFields.js';
import { resolveExternalValue } from './resolveExternalValue.js';
import { Subschema } from './Subschema.js';
import {
  FIELD_SUBSCHEMA_MAP_SYMBOL,
  OBJECT_SUBSCHEMA_SYMBOL,
  UNPATHED_ERRORS_SYMBOL,
} from './symbols.js';
import { ExternalObject, StitchingInfo } from './types.js';

/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum conversion
 */
export function defaultMergedResolver(
  parent: ExternalObject,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
) {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/ardatan/graphql-tools/issues/967
  if (!isExternalObject(parent)) {
    return defaultFieldResolver(parent, args, context, info);
  }

  // If the parent is satisfied for the left over after a nested delegation, try to resolve it
  if (parent[responseKey] === undefined) {
    const leftOver = getPlanLeftOverFromParent(parent);
    const missingFieldName = info.fieldNodes[0].name.value;
    if (
      leftOver?.unproxiableFieldNodes?.some(fieldNode => fieldNode.name.value === missingFieldName)
    ) {
      const stitchingInfo = info.schema.extensions?.['stitchingInfo'] as StitchingInfo;
      if (stitchingInfo) {
        const satisfiedSubschemaWithParent$ = new Promise<[any, Subschema]>(resolve => {
          let onResolveCallbacksByParent = leftOver.onResolveCallbacksByParent.get(parent);
          if (!onResolveCallbacksByParent) {
            onResolveCallbacksByParent = new Set();
            leftOver.onResolveCallbacksByParent.set(parent, onResolveCallbacksByParent);
          }
          onResolveCallbacksByParent.add((flattenedParent, subschema) =>
            resolve([flattenedParent, subschema]),
          );
        });

        return satisfiedSubschemaWithParent$.then(([flattenedParent, satisfiedSubschema]) => {
          const resolver =
            stitchingInfo.mergedTypes[info.parentType.name].resolvers.get(satisfiedSubschema);
          if (resolver) {
            Object.assign(parent, flattenedParent);
            const selectionSet: SelectionSetNode = {
              kind: Kind.SELECTION_SET,
              selections: info.fieldNodes,
            };
            const resolverResult$ = resolver(
              parent,
              context,
              info,
              satisfiedSubschema,
              selectionSet,
              info.parentType,
              info.parentType,
            );
            if (isPromise(resolverResult$)) {
              return resolverResult$
                .then(resolverResult =>
                  handleResolverResult(
                    resolverResult,
                    satisfiedSubschema,
                    selectionSet,
                    parent,
                    parent[FIELD_SUBSCHEMA_MAP_SYMBOL],
                    info,
                    responsePathAsArray(info.path),
                    parent[UNPATHED_ERRORS_SYMBOL],
                  ),
                )
                .then(() => handleResult(parent, responseKey, context, info));
            } else {
              handleResolverResult(
                resolverResult$,
                satisfiedSubschema,
                selectionSet,
                parent,
                parent[FIELD_SUBSCHEMA_MAP_SYMBOL],
                info,
                responsePathAsArray(info.path),
                parent[UNPATHED_ERRORS_SYMBOL],
              );
            }
          }
        });
      }
    }
  }
  return handleResult(parent, responseKey, context, info);
}

function handleResult(
  parent: ExternalObject,
  responseKey: string,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
) {
  const subschema = getSubschema(parent, responseKey);
  const data = parent[responseKey];
  const unpathedErrors = getUnpathedErrors(parent);

  const finalData$ = resolveExternalValue(data, unpathedErrors, subschema, context, info);
  const leftOver = getPlanLeftOverFromParent(parent);
  if (leftOver) {
    if (isPromise(finalData$)) {
      return finalData$.then(finalData => {
        parent[responseKey] = finalData;
        handleLeftOver(parent, info, leftOver);
        return finalData;
      });
    }
    parent[responseKey] = finalData$;
    handleLeftOver(parent, info, leftOver);
  }
  return finalData$;
}

function handleLeftOver(
  parent: ExternalObject,
  info: GraphQLResolveInfo,
  leftOver: DelegationPlanLeftOver,
) {
  const stitchingInfo = info.schema.extensions?.['stitchingInfo'] as StitchingInfo;
  if (stitchingInfo) {
    for (const possibleSubschema of leftOver.nonProxiableSubschemas) {
      const selectionSet =
        stitchingInfo.mergedTypes[info.parentType.name].selectionSets.get(possibleSubschema);
      if (selectionSet) {
        const flattenedParent$ = flattenPromise(parent);
        if (isPromise(flattenedParent$)) {
          flattenedParent$.then(flattenedParent => {
            handleFlattenedParent(flattenedParent, possibleSubschema, selectionSet, () =>
              leftOver.onResolveCallbacksByParent.get(parent),
            );
          });
        } else {
          handleFlattenedParent(flattenedParent$, possibleSubschema, selectionSet, () =>
            leftOver.onResolveCallbacksByParent.get(parent),
          );
        }
      }
    }
  }
}

function handleFlattenedParent(
  flattenedParent: ExternalObject,
  possibleSubschema: Subschema,
  selectionSet: SelectionSetNode,
  getOnResolveCallbacks: () =>
    | Set<(flattenedParent: ExternalObject, subschema: Subschema) => void>
    | undefined,
) {
  if (parentSatisfiedSelectionSet(flattenedParent, selectionSet)) {
    const onResolveCallbacks = getOnResolveCallbacks();
    if (onResolveCallbacks) {
      for (const onResolveCallback of onResolveCallbacks) {
        onResolveCallback(flattenedParent, possibleSubschema);
      }
    }
  }
}

function parentSatisfiedSelectionSet(
  parent: unknown,
  selectionSet: SelectionSetNode,
): Set<Subschema> | undefined {
  if (Array.isArray(parent)) {
    const subschemas = new Set<Subschema>();
    for (const item of parent) {
      const satisfied = parentSatisfiedSelectionSet(item, selectionSet);
      if (satisfied === undefined) {
        return undefined;
      }
      for (const subschema of satisfied) {
        subschemas.add(subschema);
      }
    }
    return subschemas;
  }
  if (parent === null) {
    return new Set<Subschema>();
  }
  if (parent === undefined) {
    return undefined;
  }
  const subschemas = new Set<Subschema>();
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const responseKey = selection.alias?.value ?? selection.name.value;
      if (parent[responseKey] === undefined) {
        return undefined;
      }
      if (isExternalObject(parent)) {
        const subschema = getSubschema(parent, responseKey) as Subschema;
        if (subschema) {
          subschemas.add(subschema);
        }
      }
      if (parent[responseKey] === null) {
        continue;
      }
      if (selection.selectionSet != null) {
        const satisfied = parentSatisfiedSelectionSet(parent[responseKey], selection.selectionSet);
        if (satisfied === undefined) {
          return undefined;
        }
        for (const subschema of satisfied) {
          subschemas.add(subschema);
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const inlineSatisfied = parentSatisfiedSelectionSet(parent, selection.selectionSet);
      if (inlineSatisfied === undefined) {
        return undefined;
      }
      for (const subschema of inlineSatisfied) {
        subschemas.add(subschema);
      }
    }
  }
  return subschemas;
}

function flattenPromise<T>(data: T): Promise<T> | T {
  if (isPromise(data)) {
    return data.then(flattenPromise) as Promise<T>;
  }
  if (Array.isArray(data)) {
    return Promise.all(data.map(flattenPromise)) as Promise<T>;
  }
  if (data != null && typeof data === 'object') {
    const jobs: PromiseLike<void>[] = [];
    const newData = {} as ExternalObject;
    for (const key in data) {
      const keyResult = flattenPromise(data[key]);
      if (isPromise(keyResult)) {
        jobs.push(
          keyResult.then(resolvedKeyResult => {
            newData[key] = resolvedKeyResult;
          }),
        );
      } else {
        newData[key] = keyResult;
      }
    }
    if (jobs.length) {
      return Promise.all(jobs).then(() => newData) as Promise<T>;
    }
    return newData as T;
  }
  return data;
}
