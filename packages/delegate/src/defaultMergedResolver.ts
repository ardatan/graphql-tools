import {
  defaultFieldResolver,
  GraphQLResolveInfo,
  Kind,
  responsePathAsArray,
  SelectionSetNode,
} from 'graphql';
import { createDeferred, getResponseKeyFromInfo, isPromise } from '@graphql-tools/utils';
import { DelegationPlanLeftOver, getPlanLeftOverFromParent } from './leftOver.js';
import {
  getSubschema,
  getUnpathedErrors,
  handleResolverResult,
  isExternalObject,
} from './mergeFields.js';
import { resolveExternalValue } from './resolveExternalValue.js';
import { Subschema } from './Subschema.js';
import { FIELD_SUBSCHEMA_MAP_SYMBOL, UNPATHED_ERRORS_SYMBOL } from './symbols.js';
import { ExternalObject, MergedTypeResolver, StitchingInfo } from './types.js';

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
  if (!Object.prototype.hasOwnProperty.call(parent, responseKey)) {
    const leftOver = getPlanLeftOverFromParent(parent);
    // Add this field to the deferred fields
    if (leftOver) {
      let missingFieldNodes = leftOver.missingFieldsParentMap.get(parent);
      if (!missingFieldNodes) {
        missingFieldNodes = [];
        leftOver.missingFieldsParentMap.set(parent, missingFieldNodes);
      }
      missingFieldNodes.push(
        ...info.fieldNodes.filter(fieldNode =>
          leftOver.unproxiableFieldNodes.some(
            unproxiableFieldNode => unproxiableFieldNode === fieldNode,
          ),
        ),
      );
      let missingDeferredFields = leftOver.missingFieldsParentDeferredMap.get(parent);
      if (!missingDeferredFields) {
        missingDeferredFields = new Map();
        leftOver.missingFieldsParentDeferredMap.set(parent, missingDeferredFields);
      }
      const deferred = createDeferred();
      missingDeferredFields.set(responseKey, deferred);
      return deferred.promise;
    }
    return undefined;
  }
  return handleResult(parent, responseKey, context, info);
}

function handleResult<TContext extends Record<string, any>>(
  parent: ExternalObject,
  responseKey: string,
  context: TContext,
  info: GraphQLResolveInfo,
) {
  const subschema = getSubschema(parent, responseKey);
  const data = parent[responseKey];
  const unpathedErrors = getUnpathedErrors(parent);

  const resolvedData$ = resolveExternalValue(data, unpathedErrors, subschema, context, info);
  const leftOver = getPlanLeftOverFromParent(parent);
  // Handle possible deferred fields if any left over from the previous delegation plan is found
  if (leftOver) {
    if (isPromise(resolvedData$)) {
      return resolvedData$.then(resolvedData => {
        parent[responseKey] = resolvedData;
        handleLeftOver(parent, context, info, leftOver);
        return resolvedData;
      });
    }
    parent[responseKey] = resolvedData$;
    handleLeftOver(parent, context, info, leftOver);
  }
  return resolvedData$;
}

function handleLeftOver<TContext extends Record<string, any>>(
  parent: ExternalObject,
  context: TContext,
  info: GraphQLResolveInfo,
  leftOver: DelegationPlanLeftOver,
) {
  const stitchingInfo = info.schema.extensions?.['stitchingInfo'] as StitchingInfo;
  if (stitchingInfo) {
    for (const possibleSubschema of leftOver.nonProxiableSubschemas) {
      const parentTypeName = info.parentType.name;
      const selectionSet =
        stitchingInfo.mergedTypes[parentTypeName].selectionSets.get(possibleSubschema);
      // Wait until the parent is flattened, then check if non proxiable subschemas are satisfied now,
      // then the deferred fields can be resolved
      if (selectionSet) {
        const flattenedParent$ = flattenPromise(parent);
        if (isPromise(flattenedParent$)) {
          flattenedParent$.then(flattenedParent => {
            handleFlattenedParent(
              flattenedParent,
              possibleSubschema,
              selectionSet,
              leftOver,
              stitchingInfo,
              parentTypeName,
              context,
              info,
            );
          });
        } else {
          handleFlattenedParent(
            flattenedParent$,
            possibleSubschema,
            selectionSet,
            leftOver,
            stitchingInfo,
            parentTypeName,
            context,
            info,
          );
        }
      }
    }
  }
}

function handleFlattenedParent<TContext extends Record<string, any>>(
  flattenedParent: ExternalObject,
  possibleSubschema: Subschema,
  selectionSet: SelectionSetNode,
  leftOver: DelegationPlanLeftOver,
  stitchingInfo: StitchingInfo,
  parentTypeName: string,
  context: TContext,
  info: GraphQLResolveInfo,
) {
  // If this subschema is satisfied now, try to resolve the deferred fields
  if (parentSatisfiedSelectionSet(flattenedParent, selectionSet)) {
    for (const [leftOverParent, missingFieldNodes] of leftOver.missingFieldsParentMap) {
      const resolver = stitchingInfo.mergedTypes[parentTypeName].resolvers.get(possibleSubschema);
      if (resolver) {
        try {
          // Extend the left over parent with missing fields
          Object.assign(leftOverParent, flattenedParent);
          const selectionSet: SelectionSetNode = {
            kind: Kind.SELECTION_SET,
            selections: missingFieldNodes,
          };
          const resolverResult$ = resolver(
            leftOverParent,
            context,
            info,
            possibleSubschema,
            selectionSet,
            info.parentType,
            info.parentType,
          );
          // Resolve the deferred fields if they are resolved
          if (isPromise(resolverResult$)) {
            (
              resolverResult$.then(resolverResult =>
                handleDeferredResolverResult(
                  resolverResult,
                  possibleSubschema,
                  selectionSet,
                  leftOverParent,
                  leftOver,
                  context,
                  info,
                ),
              ) as Promise<unknown>
            ).catch(error => handleDeferredResolverFailure(leftOver, leftOverParent, error));
          } else {
            handleDeferredResolverResult(
              resolverResult$,
              possibleSubschema,
              selectionSet,
              leftOverParent,
              leftOver,
              context,
              info,
            );
          }
        } catch (error) {
          handleDeferredResolverFailure(leftOver, leftOverParent, error);
        }
      }
    }
  }
}

function handleDeferredResolverResult<TContext extends Record<string, any>>(
  resolverResult: ReturnType<MergedTypeResolver>,
  possibleSubschema: Subschema,
  selectionSet: SelectionSetNode,
  leftOverParent: ExternalObject,
  leftOver: DelegationPlanLeftOver,
  context: TContext,
  info: GraphQLResolveInfo,
) {
  handleResolverResult(
    resolverResult,
    possibleSubschema,
    selectionSet,
    leftOverParent,
    leftOverParent[FIELD_SUBSCHEMA_MAP_SYMBOL],
    info,
    responsePathAsArray(info.path),
    leftOverParent[UNPATHED_ERRORS_SYMBOL],
  );
  const deferredFields = leftOver.missingFieldsParentDeferredMap.get(leftOverParent);
  if (deferredFields) {
    for (const [responseKey, deferred] of deferredFields) {
      // If the deferred field is resolved, resolve the deferred field
      if (Object.prototype.hasOwnProperty.call(resolverResult, responseKey)) {
        deferred.resolve(handleResult(leftOverParent, responseKey, context, info));
      }
    }
    leftOver.missingFieldsParentDeferredMap.delete(leftOverParent);
  }
}

function handleDeferredResolverFailure(
  leftOver: DelegationPlanLeftOver,
  leftOverParent: ExternalObject,
  error: unknown,
) {
  const deferredFields = leftOver.missingFieldsParentDeferredMap.get(leftOverParent);
  if (deferredFields) {
    for (const [_responseKey, deferred] of deferredFields) {
      deferred.reject(error);
    }
    leftOver.missingFieldsParentDeferredMap.delete(leftOverParent);
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
