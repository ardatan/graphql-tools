import { GraphQLOutputType, isWrappingType, isListType } from 'graphql';

/**
 * Return true if the output type is wrapped by a GraphQLList.
 *
 * @param {GraphQLOutputType} outputType - the output type which might be wrapped by a list.
 */
export function hasListType(outputType: GraphQLOutputType): boolean {
  if (isListType(outputType)) {
    return true;
  } else if (isWrappingType(outputType)) {
    return hasListType(outputType.ofType);
  }

  return false;
}
