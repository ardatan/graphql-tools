import {
  GraphQLList,
  GraphQLSchema,
  GraphQLError,
  GraphQLResolveInfo,
  getNullableType,
  GraphQLType,
  isLeafType,
  isCompositeType,
  isListType,
} from 'graphql';

import { SubschemaConfig } from '../types';

import { handleNull } from './handleNull';
import { handleObject } from './handleObject';

export function handleList(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  skipTypeMerging?: boolean
) {
  return list.map(listMember =>
    handleListMember(
      getNullableType(type.ofType),
      listMember,
      unpathedErrors,
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
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  skipTypeMerging?: boolean
): any {
  if (listMember instanceof Error) {
    return listMember;
  }

  if (listMember == null) {
    return handleNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return handleObject(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return handleList(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
  }
}
