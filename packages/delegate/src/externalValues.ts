import {
  GraphQLError,
  GraphQLList,
  GraphQLResolveInfo,
  GraphQLOutputType,
  GraphQLSchema,
  GraphQLType,
  getNullableType,
  isCompositeType,
  isLeafType,
  isListType,
  locatedError,
  responsePathAsArray,
} from 'graphql';

import AggregateError from '@ardatan/aggregate-error';

import { ExecutionResult, relocatedError } from '@graphql-tools/utils';

import { DelegationContext, Receiver, SubschemaConfig } from './types';
import { createExternalObject } from './externalObjects';
import { mergeDataAndErrors } from './mergeDataAndErrors';

export function externalValueFromResult(
  originalResult: ExecutionResult,
  delegationContext: DelegationContext,
  receiver?: Receiver
): any {
  const { fieldName, context, subschema, onLocatedError, returnType, info } = delegationContext;

  const data = originalResult.data?.[fieldName];
  const errors = originalResult.errors ?? [];
  const initialPath = info ? responsePathAsArray(info.path) : [];

  const { data: newData, unpathedErrors } = mergeDataAndErrors(
    data,
    errors,
    onLocatedError
  );

  return createExternalValue(newData, unpathedErrors, initialPath, subschema, context, info, receiver, returnType);
}

export function createExternalValue(
  data: any,
  unpathedErrors: Array<GraphQLError> = [],
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  receiver?: Receiver,
  returnType: GraphQLOutputType = info?.returnType
): any {
  const type = getNullableType(returnType);

  if (data instanceof GraphQLError) {
    return relocatedError(data, initialPath.concat(data.path));
  }

  if (data instanceof Error) {
    return data;
  }

  if (data == null) {
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(data);
  } else if (isCompositeType(type)) {
    return createExternalObject(data, unpathedErrors, initialPath, subschema, info, receiver);
  } else if (isListType(type)) {
    return createExternalList(type, data, unpathedErrors, initialPath, subschema, context, info, receiver);
  }
}

function createExternalList(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  receiver?: Receiver
) {
  return list.map(listMember =>
    createExternalListMember(
      getNullableType(type.ofType),
      listMember,
      unpathedErrors,
      initialPath,
      subschema,
      context,
      info,
      receiver
    )
  );
}

function createExternalListMember(
  type: GraphQLType,
  listMember: any,
  unpathedErrors: Array<GraphQLError>,
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  receiver?: Receiver
): any {
  if (listMember instanceof GraphQLError) {
    return relocatedError(listMember, initialPath.concat(listMember.path));
  }

  if (listMember instanceof Error) {
    return listMember;
  }

  if (listMember == null) {
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return createExternalObject(listMember, unpathedErrors, initialPath, subschema, info, receiver);
  } else if (isListType(type)) {
    return createExternalList(type, listMember, unpathedErrors, initialPath, subschema, context, info, receiver);
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
