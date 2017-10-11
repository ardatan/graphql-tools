import { GraphQLFieldResolver, responsePathAsArray } from 'graphql';
import { locatedError } from 'graphql/error';
import { getErrorsFromParent, annotateWithChildrenErrors } from './errors';

// Resolver that knows how to:
// a) handle aliases for proxied schemas
// b) handle errors from proxied schemas
const defaultMergedResolver: GraphQLFieldResolver<any, any> = (
  parent,
  args,
  context,
  info,
) => {
  const fieldName = info.fieldNodes[0].alias
    ? info.fieldNodes[0].alias.value
    : info.fieldName;
  const { ownError, childrenErrors } = getErrorsFromParent(parent, fieldName);
  if (ownError) {
    throw locatedError(
      ownError.message,
      info.fieldNodes,
      responsePathAsArray(info.path),
    );
  } else if (parent) {
    let result = parent[fieldName];
    if (childrenErrors) {
      result = annotateWithChildrenErrors(result, childrenErrors);
    }
    return result;
  } else {
    return null;
  }
};

export default defaultMergedResolver;
