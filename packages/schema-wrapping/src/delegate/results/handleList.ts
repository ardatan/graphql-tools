import {
  GraphQLList,
  GraphQLSchema,
  GraphQLError,
  GraphQLResolveInfo,
  getNullableType,
  GraphQLType,
  responsePathAsArray,
  isLeafType,
  isCompositeType,
  isListType,
} from 'graphql';

import { SubschemaConfig, getErrorsByPathSegment } from '@graphql-tools/utils';

import { handleNull } from './handleNull';
import { handleObject } from './handleObject';

export function handleList(
  type: GraphQLList<any>,
  list: Array<any>,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  skipTypeMerging?: boolean
) {
  const childErrors = getErrorsByPathSegment(errors);

  return list.map((listMember, index) =>
    handleListMember(
      getNullableType(type.ofType),
      listMember,
      index,
      index in childErrors ? childErrors[index] : [],
      subschema,
      context,
      info,
      skipTypeMerging
    )
  );
}

function handleListMember(
  type: GraphQLType,
  listMember: any,
  index: number,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  skipTypeMerging?: boolean
): any {
  if (listMember == null) {
    return handleNull(info.fieldNodes, [...responsePathAsArray(info.path), index], errors);
  }

  if (isLeafType(type)) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return handleObject(type, listMember, errors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, listMember, errors, subschema, context, info, skipTypeMerging);
  }
}
