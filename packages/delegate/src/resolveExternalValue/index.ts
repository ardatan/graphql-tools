import {
  GraphQLResolveInfo,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  GraphQLError,
  GraphQLSchema,
} from 'graphql';

import { SubschemaConfig } from '../types';

import { handleNull } from './handleNull';
import { handleObject } from './handleObject';
import { handleList } from './handleList';

export function resolveExternalValue(
  result: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  returnType = info.returnType,
  skipTypeMerging?: boolean
): any {
  const type = getNullableType(returnType);

  if (result instanceof Error) {
    return result;
  }

  if (result == null) {
    return handleNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return handleObject(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
  }
}
