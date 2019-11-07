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
  createMergedResult
} from './errors';

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  info: GraphQLResolveInfo,
  responseKey?: string
): any {
  if (!responseKey) {
    responseKey = getResponseKeyFromInfo(info);
  }

  if (!result.data || result.data[responseKey] == null) {
    return (result.errors) ? handleErrors(info, result.errors) : null;
  }

  return handleResult(info, result.data[responseKey], result.errors || []);
}

export function handleResult(
  info: GraphQLResolveInfo,
  result: any,
  errors: ReadonlyArray<GraphQLError>
): any {
  const nullableType = getNullableType(info.returnType);

  if (isLeafType(nullableType)) {
    return nullableType.parseValue(result);
  } else if (isCompositeType(nullableType)) {
    return createMergedResult(result, errors);
  } else if (isListType(nullableType)) {
    return createMergedResult(result, errors).map(
      (r: any) => parseOutputValue(getNullableType(nullableType.ofType), r)
    );
  }
}

function parseOutputValue(type: GraphQLType, value: any) {
  if (isLeafType(type)) {
    return type.parseValue(value);
  } else if (isCompositeType(type)) {
    return value;
  } else if (isListType(type)) {
    return value.map((v: any) => parseOutputValue(getNullableType(type.ofType), v));
  }
}

export function handleErrors(
  info: GraphQLResolveInfo,
  errors: ReadonlyArray<GraphQLError>,
) {
  throw relocatedError(
    combineErrors(errors),
    info.fieldNodes,
    responsePathAsArray(info.path)
  );
}
