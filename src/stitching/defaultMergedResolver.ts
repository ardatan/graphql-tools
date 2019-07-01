import { GraphQLFieldResolver } from 'graphql';
import { getErrorsFromParent } from './errors';
import { handleResult } from './checkResultAndHandleErrors';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';

// Resolver that knows how to:
// a) handle aliases for proxied schemas
// b) handle errors from proxied schemas
// c) handle external to internal enum coversion
const defaultMergedResolver: GraphQLFieldResolver<any, any> = (parent, args, context, info) => {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);
  const errors = getErrorsFromParent(parent, responseKey);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/apollographql/graphql-tools/issues/967
  if (!Array.isArray(errors)) {
    if (typeof parent[info.fieldName] === 'function') {
      return parent[info.fieldName](parent, args, context, info);
    }
    return parent[info.fieldName];
  }

  return handleResult(info, parent[responseKey], errors);
};

export default defaultMergedResolver;
