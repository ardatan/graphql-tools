import { GraphQLError, responsePathAsArray, locatedError } from 'graphql';

import AggregateError from '@ardatan/aggregate-error';

import { ExecutionResult, relocatedError } from '@graphql-tools/utils';

import { DelegationContext, Receiver } from './types';
import { resolveExternalValue } from './resolveExternalValue';

export function externalValueFromResult(
  originalResult: ExecutionResult,
  delegationContext: DelegationContext,
  receiver?: Receiver
): any {
  const { fieldName, context, subschema, onLocatedError, returnType, info } = delegationContext;

  const data = originalResult.data?.[fieldName];
  const errors = originalResult.errors ?? [];

  const { data: newData, unpathedErrors } = mergeDataAndErrors(
    data,
    errors,
    info ? responsePathAsArray(info.path) : undefined,
    onLocatedError
  );

  return resolveExternalValue(newData, unpathedErrors, subschema, context, info, receiver, returnType);

}

export function mergeDataAndErrors(
  data: any,
  errors: ReadonlyArray<GraphQLError> = [],
  path: ReadonlyArray<string | number>,
  onLocatedError: (originalError: GraphQLError) => GraphQLError,
  index = 1
): { data: any; unpathedErrors: Array<GraphQLError> } {
  if (data == null) {
    if (!errors.length) {
      return { data: null, unpathedErrors: [] };
    }

    if (errors.length === 1) {
      const error = onLocatedError ? onLocatedError(errors[0]) : errors[0];
      const newPath =
        path === undefined ? error.path : error.path === undefined ? path : path.concat(error.path.slice(1));

      return { data: relocatedError(errors[0], newPath), unpathedErrors: [] };
    }

    const newError = locatedError(new AggregateError(errors), undefined, path);

    return { data: newError, unpathedErrors: [] };
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
        onLocatedError,
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
