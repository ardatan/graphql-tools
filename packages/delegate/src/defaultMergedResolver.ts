import {
  defaultFieldResolver,
  GraphQLResolveInfo,
  Kind,
  responsePathAsArray,
  SelectionSetNode,
} from 'graphql';
import { getResponseKeyFromInfo, isPromise } from '@graphql-tools/utils';
import { getPlanLeftOverFromParent } from './leftOver.js';
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

  if (parent[responseKey] === undefined) {
    const leftOver = getPlanLeftOverFromParent(parent);
    const missingFieldName = info.fieldNodes[0].name.value;
    if (
      leftOver?.unproxiableFieldNodes?.some(fieldNode => fieldNode.name.value === missingFieldName)
    ) {
      const stitchingInfo = info.schema.extensions?.['stitchingInfo'] as StitchingInfo;
      if (stitchingInfo) {
        const satisfiedSubschema = new Promise<Subschema | undefined>(resolve => {
          // TODO: Find a better solution than polling
          const interval = setInterval(() => {
            if (parent[responseKey] != null) {
              clearInterval(interval);
              resolve(undefined);
            }
            for (const possibleSubschema of leftOver.nonProxiableSubschemas) {
              const selectionSet =
                stitchingInfo.mergedTypes[info.parentType.name].selectionSets.get(
                  possibleSubschema,
                );
              if (selectionSet && parentSatisfiedSelectionSet(parent, selectionSet)) {
                clearInterval(interval);
                resolve(possibleSubschema);
              }
            }
          }, 100);
        });
        return satisfiedSubschema.then(satisfiedSubschema => {
          if (satisfiedSubschema) {
            const resolver =
              stitchingInfo.mergedTypes[info.parentType.name].resolvers.get(satisfiedSubschema);
            if (resolver) {
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

  return resolveExternalValue(data, unpathedErrors, subschema, context, info);
}

function parentSatisfiedSelectionSet(
  parent: any,
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
    return parent[OBJECT_SUBSCHEMA_SYMBOL];
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
      const subschema = getSubschema(parent, responseKey) as Subschema;
      if (subschema) {
        subschemas.add(subschema);
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
