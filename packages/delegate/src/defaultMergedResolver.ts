import { GraphQLResolveInfo, defaultFieldResolver } from 'graphql';

import { ValueOrPromise } from 'value-or-promise';

import { getResponseKeyFromInfo } from '@graphql-tools/utils';

import { ExternalObject } from './types';

import { createExternalValue } from './externalValues';
import {
  getInitialPath,
  getInitialPossibleFields,
  getSubschema,
  getUnpathedErrors,
  isExternalObject,
} from './externalObjects';

import { getMergedParent } from './getMergedParent';

/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum/scalar conversion
 * d) handle type merging
 * e) handle deferred values
 */
export function defaultMergedResolver(
  parent: ExternalObject,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  if (!isExternalObject(parent)) {
    return defaultFieldResolver(parent, args, context, info);
  }

  const responseKey = getResponseKeyFromInfo(info);

  const initialPossibleFields = getInitialPossibleFields(parent);

  if (initialPossibleFields === undefined) {
    // TODO: can this be removed in the next major release?
    // legacy use of delegation without setting transformedSchema
    const data = parent[responseKey];
    if (data !== undefined) {
      return resolveField(parent, responseKey, context, info);
    }
  } else if (info.fieldName in initialPossibleFields) {
    return resolveField(parent, responseKey, context, info);
  }

  return new ValueOrPromise(() => getMergedParent(parent, context, info))
    .then(mergedParent => resolveField(mergedParent, responseKey, context, info))
    .resolve();
}

function resolveField(
  parent: ExternalObject,
  responseKey: string,
  context: Record<string, any>,
  info: GraphQLResolveInfo
): any {
  const initialPath = getInitialPath(parent);
  const subschema = getSubschema(parent, responseKey);
  const unpathedErrors = getUnpathedErrors(parent);

  return createExternalValue(parent[responseKey], unpathedErrors, initialPath, subschema, context, info);
}
