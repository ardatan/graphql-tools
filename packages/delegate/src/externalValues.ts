import {
  GraphQLResolveInfo,
  getNullableType,
  isCompositeType,
  isListType,
  GraphQLError,
  GraphQLSchema,
  GraphQLList,
  GraphQLType,
  locatedError,
  GraphQLOutputType,
  responsePathAsArray,
} from 'graphql';

import { AggregateError, relocatedError } from '@graphql-tools/utils';

import { ExternalValueFromResultOptions, SubschemaConfig } from './types';
import { annotateExternalObject } from './externalObjects';
import { mergeDataAndErrors } from './mergeDataAndErrors';

export function externalValueFromResult<TContext = Record<string, any>>({
  result,
  schema,
  info,
  context,
  fieldName = getFieldName(info),
  returnType = getReturnType(info),
  onLocatedError = (error: GraphQLError) => error,
}: ExternalValueFromResultOptions<TContext>): any {
  const data = result.data?.[fieldName];
  const errors = result.errors ?? [];
  const initialPath = info ? responsePathAsArray(info.path) : [];

  const { data: newData, unpathedErrors } = mergeDataAndErrors(data, errors, onLocatedError);

  return createExternalValue(newData, unpathedErrors, initialPath, schema, context, info, returnType);
}

export function createExternalValue<TContext = Record<string, any>>(
  data: any,
  unpathedErrors: Array<GraphQLError>,
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: TContext,
  info?: GraphQLResolveInfo,
  returnType = getReturnType(info)
): any {
  const type = getNullableType(returnType);

  if (data instanceof GraphQLError) {
    return relocatedError(data, data.path ? initialPath.concat(data.path) : initialPath);
  }

  if (data instanceof Error) {
    return data;
  }

  if (data == null) {
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if ('parseValue' in type) {
    return type.parseValue(data);
  } else if (isCompositeType(type)) {
    return annotateExternalObject(data, unpathedErrors, initialPath, subschema, info);
  } else if (isListType(type)) {
    return createExternalList(type, data, unpathedErrors, initialPath, subschema, context, info);
  }
}

function createExternalList<TContext = Record<string, any>>(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo
) {
  return list.map(listMember =>
    createExternalListMember(
      getNullableType(type.ofType),
      listMember,
      unpathedErrors,
      initialPath,
      subschema,
      context,
      info
    )
  );
}

function createExternalListMember<TContext = Record<string, any>>(
  type: GraphQLType,
  listMember: any,
  unpathedErrors: Array<GraphQLError>,
  initialPath: Array<string | number>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo
): any {
  if (listMember instanceof GraphQLError) {
    return relocatedError(listMember, listMember.path ? initialPath.concat(listMember.path) : initialPath);
  }

  if (listMember instanceof Error) {
    return listMember;
  }

  if (listMember == null) {
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if ('parseValue' in type) {
    return type.parseValue(listMember);
  } else if (isCompositeType(type)) {
    return annotateExternalObject(listMember, unpathedErrors, initialPath, subschema, info);
  } else if (isListType(type)) {
    return createExternalList(type, listMember, unpathedErrors, initialPath, subschema, context, info);
  }
}

const reportedErrors = new WeakMap<GraphQLError, boolean>();

function reportUnpathedErrorsViaNull(unpathedErrors: Array<GraphQLError>) {
  if (unpathedErrors.length) {
    const unreportedErrors: Array<GraphQLError> = [];
    for (const error of unpathedErrors) {
      if (!reportedErrors.has(error)) {
        unreportedErrors.push(error);
        reportedErrors.set(error, true);
      }
    }

    if (unreportedErrors.length) {
      if (unreportedErrors.length === 1) {
        return unreportedErrors[0];
      }

      const combinedError = new AggregateError(unreportedErrors);
      // We cast path as any for GraphQL.js 14 compat
      // locatedError path argument must be defined, but it is just forwarded to a constructor that allows a undefined value
      // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/locatedError.js#L25
      // https://github.com/graphql/graphql-js/blob/b4bff0ba9c15c9d7245dd68556e754c41f263289/src/error/GraphQLError.js#L19
      return locatedError(combinedError, undefined as any, unreportedErrors[0].path as any);
    }
  }

  return null;
}

function getFieldName(info: GraphQLResolveInfo | undefined): string {
  if (info == null) {
    throw new Error(`Data cannot be extracted from result without an explicit key or source schema.`);
  }
  return info.fieldName;
}

function getReturnType(info: GraphQLResolveInfo | undefined): GraphQLOutputType {
  if (info == null) {
    throw new Error(`Return type cannot be inferred without a source schema.`);
  }
  return info.returnType;
}
