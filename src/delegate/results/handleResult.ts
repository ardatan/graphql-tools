import {
  GraphQLResolveInfo,
  responsePathAsArray,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  GraphQLError,
  GraphQLSchema,
} from 'graphql';

import { SubschemaConfig } from '../../Interfaces';

import { handleNull } from './handleNull';
import { handleObject } from './handleObject';
import { handleList } from './handleList';

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
    return handleNull(info.fieldNodes, [...responsePathAsArray(info.path)], errors);
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
