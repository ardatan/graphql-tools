import { defaultFieldResolver, GraphQLResolveInfo } from 'graphql';

import { getResponseKeyFromInfo } from '@graphql-tools/utils';

import { resolveExternalValue } from './resolveExternalValue';
import { getSubschema } from './Subschema';
import { getErrors, isExternalData } from './externalData';
import { ExternalData } from './types';

/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum coversion
 */
export function defaultMergedResolver(
  parent: ExternalData,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
) {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/apollographql/graphql-tools/issues/967
  if (!isExternalData(parent)) {
    return defaultFieldResolver(parent, args, context, info);
  }

  const data = parent[responseKey];
  const subschema = getSubschema(parent, responseKey);
  const errors = getErrors(parent, responseKey);

  return resolveExternalValue(data, errors, subschema, context, info);
}
