import {
  GraphQLResolveInfo,
  GraphQLOutputType,
  GraphQLSchema,
  GraphQLError,
  responsePathAsArray,
  locatedError,
} from 'graphql';

import AggregateError from '@ardatan/aggregate-error';

import { getResponseKeyFromInfo, ExecutionResult, relocatedError } from '@graphql-tools/utils';

import { SubschemaConfig, Transform, DelegationContext } from '../types';
import { resolveExternalValue } from '../resolveExternalValue';

export default class CheckResultAndHandleErrors implements Transform {
  private readonly context?: Record<string, any>;
  private readonly info: GraphQLResolveInfo;
  private readonly fieldName?: string;
  private readonly subschema?: GraphQLSchema | SubschemaConfig;
  private readonly returnType?: GraphQLOutputType;
  private readonly typeMerge?: boolean;

  constructor(
    info: GraphQLResolveInfo,
    fieldName?: string,
    subschema?: GraphQLSchema | SubschemaConfig,
    context?: Record<string, any>,
    returnType: GraphQLOutputType = info.returnType,
    typeMerge?: boolean
  ) {
    this.context = context;
    this.info = info;
    this.fieldName = fieldName;
    this.subschema = subschema;
    this.returnType = returnType;
    this.typeMerge = typeMerge;
  }

  public transformResult(
    originalResult: ExecutionResult,
    _delegationContext: DelegationContext,
    _transformationContext: Record<string, any>
  ): ExecutionResult {
    return checkResultAndHandleErrors(
      originalResult,
      this.context != null ? this.context : {},
      this.info,
      this.fieldName,
      this.subschema,
      this.returnType,
      this.typeMerge
    );
  }
}

export function checkResultAndHandleErrors(
  result: ExecutionResult,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
  responseKey: string = getResponseKeyFromInfo(info),
  subschema?: GraphQLSchema | SubschemaConfig,
  returnType: GraphQLOutputType = info.returnType,
  skipTypeMerging?: boolean
): any {
  const { data, unpathedErrors } = mergeDataAndErrors(
    result.data == null ? undefined : result.data[responseKey],
    result.errors == null ? [] : result.errors,
    info ? responsePathAsArray(info.path) : undefined
  );

  return resolveExternalValue(data, unpathedErrors, subschema, context, info, returnType, skipTypeMerging);
}

export function mergeDataAndErrors(
  data: any,
  errors: ReadonlyArray<GraphQLError>,
  path: Array<string | number>,
  index = 1
): { data: any; unpathedErrors: Array<GraphQLError> } {
  if (data == null) {
    if (!errors.length) {
      return { data: null, unpathedErrors: [] };
    }

    if (errors.length === 1) {
      const error = errors[0];
      const newPath =
        path === undefined ? error.path : error.path === undefined ? path : path.concat(error.path.slice(1));
      return { data: relocatedError(errors[0], newPath), unpathedErrors: [] };
    }

    return { data: locatedError(new AggregateError(errors), undefined, path), unpathedErrors: [] };
  }

  if (!errors.length) {
    return { data, unpathedErrors: [] };
  }

  let unpathedErrors: Array<GraphQLError> = [];

  const errorMap: Record<string, Array<GraphQLError>> = Object.create(null);
  errors.forEach(error => {
    const pathSegment = error.path?.[index];
    if (pathSegment != null) {
      const pathSegmentErrors = errorMap[pathSegment];
      if (pathSegmentErrors === undefined) {
        errorMap[pathSegment] = [error];
      } else {
        pathSegmentErrors.push(error);
      }
    } else {
      unpathedErrors.push(error);
    }
  });

  Object.keys(errorMap).forEach(pathSegment => {
    if (data[pathSegment] !== undefined) {
      const { data: newData, unpathedErrors: newErrors } = mergeDataAndErrors(
        data[pathSegment],
        errorMap[pathSegment],
        path,
        index + 1
      );
      data[pathSegment] = newData;
      unpathedErrors = unpathedErrors.concat(newErrors);
    } else {
      unpathedErrors = unpathedErrors.concat(errorMap[pathSegment]);
    }
  });

  return { data, unpathedErrors };
}
