import { GraphQLError, locatedError } from 'graphql';

import { AggregateError, relocatedError } from '@graphql-tools/utils';

export function mergeDataAndErrors(
  data: any,
  errors: ReadonlyArray<GraphQLError> = [],
  index = 1
): { data: any; unpathedErrors: Array<GraphQLError> } {
  if (data == null) {
    if (!errors.length) {
      return { data: null, unpathedErrors: [] };
    }

    if (errors.length === 1) {
      const error = errors[0];
      const newPath = error.path === undefined ? [] : error.path.slice(1);
      const newError = relocatedError(error, newPath);
      return { data: newError, unpathedErrors: [] };
    }

    const firstError = errors[0];
    const newPath = firstError.path === undefined ? [] : firstError.path.slice(1);
    const newError = locatedError(new AggregateError(errors), undefined, newPath);

    return { data: newError, unpathedErrors: [] };
  }

  if (!errors.length) {
    return { data, unpathedErrors: [] };
  }

  const unpathedErrors: Array<GraphQLError> = [];

  const errorMap = new Map<string | number, Array<GraphQLError>>();
  for (const error of errors) {
    const pathSegment = error.path?.[index];
    if (pathSegment != null) {
      let pathSegmentErrors = errorMap.get(pathSegment);
      if (pathSegmentErrors === undefined) {
        pathSegmentErrors = [error];
        errorMap.set(pathSegment, pathSegmentErrors);
      } else {
        pathSegmentErrors.push(error);
      }
    } else {
      unpathedErrors.push(error);
    }
  }

  for (const [pathSegment, pathSegmentErrors] of errorMap) {
    if (data[pathSegment] !== undefined) {
      const { data: newData, unpathedErrors: newErrors } = mergeDataAndErrors(
        data[pathSegment],
        pathSegmentErrors,
        index + 1
      );
      data[pathSegment] = newData;
      unpathedErrors.push(...newErrors);
    } else {
      unpathedErrors.push(...pathSegmentErrors);
    }
  }

  return { data, unpathedErrors };
}
