import { defaultFieldResolver, GraphQLResolveInfo } from 'graphql';

import { getResponseKeyFromInfo, getErrors } from '@graphql-tools/utils';

import { handleResult } from './results/handleResult';
import { getSubschema } from './Subschema';

/**
 * Resolver that knows how to:
 * a) handle aliases for proxied schemas
 * b) handle errors from proxied schemas
 * c) handle external to internal enum coversion
 */
export function defaultMergedResolver(
  parent: Record<string, any>,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo
) {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);
  const errors = getErrors(parent, responseKey);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/apollographql/graphql-tools/issues/967
  if (!errors) {
    return defaultFieldResolver(parent, args, context, info);
  }

  const result = parent[responseKey];
  const subschema = getSubschema(parent, responseKey);

  return handleResult(result, errors, subschema, context, info);
}
