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
  const responseKey = info.fieldNodes[0].alias
    ? info.fieldNodes[0].alias.value
    : info.fieldName;
  const errorResult = getErrorsFromParent(parent, responseKey);
  if (errorResult.kind === 'OWN') {
    throw locatedError(
      new Error(errorResult.error.message),
      info.fieldNodes,
      responsePathAsArray(info.path),
    );
  } else if (parent) {
    let result = parent[responseKey];

    // subscription result mapping
    if (!result && parent.data && parent.data[responseKey]) {
      result = parent.data[responseKey];
    }

    if (errorResult.errors) {
      result = annotateWithChildrenErrors(result, errorResult.errors);
    }
    return result;
  } else {
    return null;
  }
};

export default defaultMergedResolver;
