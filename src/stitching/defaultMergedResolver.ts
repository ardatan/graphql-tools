import { defaultFieldResolver, getNullableType } from 'graphql';
import { getErrorsFromParent, getSubschemasFromParent, MERGED_NULL_SYMBOL } from './errors';
import { handleResult, handleErrors } from './checkResultAndHandleErrors';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import { IGraphQLToolsResolveInfo } from '../Interfaces';

// Resolver that knows how to:
// a) handle aliases for proxied schemas
// b) handle errors from proxied schemas
// c) handle external to internal enum coversion
export default function defaultMergedResolver(
  parent: Record<string, any>,
  args: Record<string, any>,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
) {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);
  const errors = getErrorsFromParent(parent, responseKey);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/apollographql/graphql-tools/issues/967
  if (!errors) {
    return defaultFieldResolver(parent, args, context, info);
  }

  const result = parent[responseKey];

  if (result == null || result[MERGED_NULL_SYMBOL]) {
    return (errors.length) ? handleErrors(info.fieldNodes, info.path, errors) : null;
  }

  const parentSubschemas = getSubschemasFromParent(parent);
  return handleResult(getNullableType(info.returnType), result, errors, parentSubschemas, context, info);
}
