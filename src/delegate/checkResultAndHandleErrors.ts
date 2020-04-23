import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  ExecutionResult,
  GraphQLError,
  GraphQLOutputType,
  GraphQLSchema,
} from 'graphql';

import { SubschemaConfig } from '../Interfaces';
import { getResponseKeyFromInfo } from '../stitch/getResponseKeyFromInfo';

import { handleNull } from './results/handleNull';
import { handleObject } from './results/handleObject';
import { handleList } from './results/handleList';

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  responseKey: string = getResponseKeyFromInfo(info),
  subschema?: GraphQLSchema | SubschemaConfig,
  returnType: GraphQLOutputType = info.returnType,
  skipTypeMerging?: boolean,
): any {
  const errors = result.errors != null ? result.errors : [];
  const data = result.data != null ? result.data[responseKey] : undefined;

  return handleResult(
    data,
    errors,
    subschema,
    context,
    info,
    returnType,
    skipTypeMerging,
  );
}

export function handleResult(
  result: any,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  returnType = info.returnType,
  skipTypeMerging?: boolean,
): any {
  const type = getNullableType(returnType);

  if (result == null) {
    return handleNull(info.fieldNodes, responsePathAsArray(info.path), errors);
  }

  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return handleObject(
      type,
      result,
      errors,
      subschema,
      context,
      info,
      skipTypeMerging,
    );
  } else if (isListType(type)) {
    return handleList(
      type,
      result,
      errors,
      subschema,
      context,
      info,
      skipTypeMerging,
    );
  }
}
