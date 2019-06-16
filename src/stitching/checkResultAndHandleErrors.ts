import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isObjectType,
  isListType,
  isEnumType,
  ExecutionResult,
  GraphQLError,
} from 'graphql';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import {
  relocatedError,
  combineErrors,
  annotateWithChildrenErrors
} from './errors';

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  info: GraphQLResolveInfo,
  responseKey?: string
): any {
  if (!responseKey) {
    responseKey = getResponseKeyFromInfo(info);
  }

  if (!result.data) {
    if (result.errors) {
      throw relocatedError(
        combineErrors(result.errors),
        info.fieldNodes,
        responsePathAsArray(info.path)
      );
    } else {
      return null;
    }
  }

  return handleResult(info, result.data[responseKey], result.errors || []);
}

export function handleResult(
  info: GraphQLResolveInfo,
  resultObject: any,
  errors: ReadonlyArray<GraphQLError>
): any {
  if (!resultObject) {
    if (errors.length) {
      throw relocatedError(
        combineErrors(errors),
        info.fieldNodes,
        responsePathAsArray(info.path)
      );
    } else {
      return null;
    }
  }

  const nullableType = getNullableType(info.returnType);

  if (isObjectType(nullableType) || isListType(nullableType)) {
    annotateWithChildrenErrors(resultObject, errors);
  } else if (isEnumType(nullableType)) {
    const value = nullableType.getValue(resultObject);
    if (value) {
      return value.value;
    }
  }

  return resultObject;
}
