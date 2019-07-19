import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  ExecutionResult,
  GraphQLError,
  GraphQLType,
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
  result: any,
  errors: ReadonlyArray<GraphQLError>
): any {
  if (result == null) {
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

  if (isCompositeType(nullableType) || isListType(nullableType)) {
    annotateWithChildrenErrors(result, errors);
  }

  return parseOutputValue(nullableType, result);
}

function parseOutputValue(type: GraphQLType, value: any) {
  if (isListType(type)) {
    return value.map((v: any) => parseOutputValue(getNullableType(type.ofType), v));
  } else if (isLeafType(type)) {
    return type.parseValue(value);
  }
  return value;
}
