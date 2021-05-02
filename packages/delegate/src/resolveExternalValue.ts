import {
  GraphQLResolveInfo,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  GraphQLError,
  GraphQLSchema,
  GraphQLList,
  GraphQLType,
  locatedError,
} from 'graphql';

import AggregateError from '@ardatan/aggregate-error';

import { SubschemaConfig } from './types';
import { annotateExternalObject, isExternalObject } from './externalObjects';
import { Receiver } from './Receiver';

export function resolveExternalValue(
  result: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  receiver?: Receiver,
  returnType = info?.returnType
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
    return resolveExternalObject(result, unpathedErrors, subschema, info, receiver);
  } else if (isListType(type)) {
    return resolveExternalList(type, result, unpathedErrors, subschema, context, info, receiver);
  }
}

function resolveExternalObject(
  object: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  info: GraphQLResolveInfo,
  receiver?: Receiver
) {
  // if we have already resolved this object, for example, when the identical object appears twice
  // in a list, see https://github.com/ardatan/graphql-tools/issues/2304
  if (isExternalObject(object)) {
    return object;
  }

  annotateExternalObject(object, unpathedErrors, subschema, info, receiver);

  return object;
}

function resolveExternalList(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  receiver?: Receiver
) {
  return list.map(listMember =>
    resolveExternalListMember(
      getNullableType(type.ofType),
      listMember,
      unpathedErrors,
      subschema,
      context,
      info,
      receiver
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
  receiver?: Receiver
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
    return resolveExternalObject(listMember, unpathedErrors, subschema, info, receiver);
  } else if (isListType(type)) {
    return resolveExternalList(type, listMember, unpathedErrors, subschema, context, info, receiver);
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
