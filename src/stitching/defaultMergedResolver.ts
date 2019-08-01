import { GraphQLError, GraphQLFieldResolver, responsePathAsArray } from 'graphql';
import { getErrorsFromParent, annotateWithChildrenErrors } from './errors';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';

// Resolver that knows how to:
// a) handle aliases for proxied schemas
// b) handle errors from proxied schemas
const defaultMergedResolver: GraphQLFieldResolver<any, any> = (parent, args, context, info) => {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);
  const errorResult = getErrorsFromParent(parent, responseKey);

  if (errorResult.kind === 'OWN') {
    throw new GraphQLError(
      errorResult.error.message,
      info.fieldNodes,
      undefined,
      undefined,
      responsePathAsArray(info.path),
      undefined,
      errorResult.error.extensions,
    );
  }

  let result = parent[responseKey];

  if (result == null) {
    result = parent[info.fieldName];
  }

  // subscription result mapping
  if (!result && parent.data && parent.data[responseKey]) {
    result = parent.data[responseKey];
  }

  if (errorResult.errors) {
    result = annotateWithChildrenErrors(result, errorResult.errors);
  }
  return result;
};

export default defaultMergedResolver;
