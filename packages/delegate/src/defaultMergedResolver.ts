import { defaultFieldResolver, GraphQLResolveInfo } from 'graphql';

import { getResponseKeyFromInfo } from '@graphql-tools/utils';

import { resolveExternalValue } from './resolveExternalValue.js';
import { getSubschema, getUnpathedErrors, isExternalObject } from './mergeFields.js';
import { ExternalObject } from './types.js';

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
  info: GraphQLResolveInfo
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

  const data = parent[responseKey];
  const unpathedErrors = getUnpathedErrors(parent);
  const subschema = getSubschema(parent, responseKey);

  return resolveExternalValue(data, unpathedErrors, subschema, context, info);
}
