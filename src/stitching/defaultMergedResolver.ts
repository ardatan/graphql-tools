import {
  GraphQLFieldResolver,
  responsePathAsArray,
  getNullableType,
  isObjectType,
  isListType
} from 'graphql';
import {
  getErrorsFromParent,
  annotateWithChildrenErrors,
  combineErrors,
  relocatedError
} from './errors';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';

// Resolver that knows how to:
// a) handle aliases for proxied schemas
// b) handle errors from proxied schemas
const defaultMergedResolver: GraphQLFieldResolver<any, any> = (parent, args, context, info) => {
  if (!parent) {
    return null;
  }

  const responseKey = getResponseKeyFromInfo(info);
  const errors = getErrorsFromParent(parent, responseKey);

  // check to see if parent is not a proxied result, i.e. if parent resolver was manually overwritten
  // See https://github.com/apollographql/graphql-tools/issues/967
  if (!Array.isArray(errors)) {
    return parent[info.fieldName];
  }

  let result = parent[responseKey];

  // if null, throw all possible errors
  if (!result && errors.length) {
    throw relocatedError(
      combineErrors(errors),
      info.fieldNodes,
      responsePathAsArray(info.path)
    );
  }

  const nullableType = getNullableType(info.returnType);
  if (isObjectType(nullableType) || isListType(nullableType)) {
    annotateWithChildrenErrors(result, errors);
  }

  return result;
};

export default defaultMergedResolver;
