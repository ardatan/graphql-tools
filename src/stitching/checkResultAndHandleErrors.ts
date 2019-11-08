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
  GraphQLSchema,
} from 'graphql';
import { getResponseKeyFromInfo } from './getResponseKeyFromInfo';
import {
  relocatedError,
  combineErrors,
  createMergedResult
} from './errors';
import {
  SubschemaConfig,
  IGraphQLToolsResolveInfo,
} from '../Interfaces';

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  info: GraphQLResolveInfo,
  responseKey?: string,
  subschema?: GraphQLSchema | SubschemaConfig,
): any {
  if (!responseKey) {
    responseKey = getResponseKeyFromInfo(info);
  }

  if (!result.data || result.data[responseKey] == null) {
    return (result.errors) ? handleErrors(info, result.errors) : null;
  }

  return handleResult(info, result.data[responseKey], result.errors || [], [subschema]);
}

export function handleResult(
  info: IGraphQLToolsResolveInfo,
  result: any,
  errors: ReadonlyArray<GraphQLError>,
  subschemas: Array<GraphQLSchema | SubschemaConfig>,
): any {
  const nullableType = getNullableType(info.returnType);

  if (isLeafType(nullableType)) {
    return nullableType.parseValue(result);
  } else if (isCompositeType(nullableType)) {
    return createMergedResult(result, errors, subschemas);
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
