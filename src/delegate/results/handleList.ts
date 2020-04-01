import {
  GraphQLList,
  GraphQLSchema,
  GraphQLError,
  getNullableType,
  GraphQLType,
  responsePathAsArray,
  isLeafType,
  isCompositeType,
  isListType,
} from 'graphql';

import { SubschemaConfig, IGraphQLToolsResolveInfo } from '../../Interfaces';
import { getErrorsByPathSegment } from '../../stitch/errors';

import { handleNull } from './handleNull';
import { handleObject } from './handleObject';

export function handleList(
  type: GraphQLList<any>,
  list: Array<any>,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
) {
  const childErrors = getErrorsByPathSegment(errors);

  return list.map((listMember, index) =>
    handleListMember(
      getNullableType(type.ofType),
      listMember,
      index,
      childErrors[index] != null ? childErrors[index] : [],
      subschema,
      context,
      info,
      skipTypeMerging,
    ),
  );
}

function handleListMember(
  type: GraphQLType,
  listMember: any,
  index: number,
  errors: ReadonlyArray<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: IGraphQLToolsResolveInfo,
  skipTypeMerging?: boolean,
): any {
  if (listMember == null) {
    return handleNull(
      info.fieldNodes,
      [...responsePathAsArray(info.path), index],
      errors,
    );
  }

  if (isLeafType(type)) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return handleObject(
      type,
      listMember,
      errors,
      subschema,
      context,
      info,
      skipTypeMerging,
    );
  } else if (isListType(type)) {
    return handleList(
      type,
      listMember,
      errors,
      subschema,
      context,
      info,
      skipTypeMerging,
    );
  }
}
