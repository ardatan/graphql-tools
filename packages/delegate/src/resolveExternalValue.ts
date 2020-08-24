import {
  GraphQLResolveInfo,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  GraphQLError,
  GraphQLSchema,
  GraphQLCompositeType,
  isAbstractType,
  GraphQLList,
  GraphQLType,
  locatedError,
} from 'graphql';

import { SubschemaConfig } from './types';
import { annotateExternalObject } from './externalObjects';
import { getFieldsNotInSubschema } from './getFieldsNotInSubschema';
import { mergeFields } from './mergeFields';

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
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(result);
  } else if (isCompositeType(type)) {
    return resolveExternalObject(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return resolveExternalList(type, result, unpathedErrors, subschema, context, info, skipTypeMerging);
  }
}

function resolveExternalObject(
  type: GraphQLCompositeType,
  object: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  skipTypeMerging?: boolean
) {
  const stitchingInfo = info?.schema.extensions?.stitchingInfo;

  annotateExternalObject(object, unpathedErrors, subschema);

  if (skipTypeMerging || !stitchingInfo) {
    return object;
  }

  const typeName = isAbstractType(type) ? info.schema.getTypeMap()[object.__typename].name : type.name;
  const mergedTypeInfo = stitchingInfo.mergedTypes[typeName];
  let targetSubschemas: Array<SubschemaConfig>;

  if (mergedTypeInfo != null) {
    targetSubschemas = mergedTypeInfo.targetSubschemas.get(subschema);
  }

  if (!targetSubschemas) {
    return object;
  }

  const fieldNodes = getFieldsNotInSubschema(info, subschema, mergedTypeInfo);

  return mergeFields(
    mergedTypeInfo,
    typeName,
    object,
    fieldNodes,
    subschema as SubschemaConfig,
    targetSubschemas,
    context,
    info
  );
}

function resolveExternalList(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  skipTypeMerging?: boolean
) {
  return list.map(listMember =>
    resolveExternalListMember(
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

function resolveExternalListMember(
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
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return resolveExternalObject(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
  } else if (isListType(type)) {
    return resolveExternalList(type, listMember, unpathedErrors, subschema, context, info, skipTypeMerging);
  }
}

const reportedErrors: WeakMap<GraphQLError, boolean> = new Map();

function reportUnpathedErrorsViaNull(unpathedErrors: Array<GraphQLError>) {
  if (unpathedErrors.length) {
    const unreportedErrors: Array<GraphQLError> = [];
    unpathedErrors.forEach(error => {
      if (!reportedErrors.has(error)) {
        unreportedErrors.push(error);
        reportedErrors.set(error, true);
      }
    });

    if (unreportedErrors.length) {
      if (unreportedErrors.length === 1) {
        return unreportedErrors[0];
      }

      const combinedError = new AggregateError(unreportedErrors);
      return locatedError(combinedError, undefined, unreportedErrors[0].path);
    }
  }

  return null;
}
