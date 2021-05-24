import { GraphQLError, locatedError } from 'graphql';
import { relocatedError } from '@graphql-tools/utils';

export function mergeDataAndErrors(
  data: any,
  errors: ReadonlyArray<GraphQLError> = [],
  onLocatedError = (originalError: GraphQLError) => originalError,
  index = 1
): { data: any; unpathedErrors: Array<GraphQLError> } {
  if (data == null) {
    if (!errors.length) {
      return { data: null, unpathedErrors: [] };
    }

    if (errors.length === 1) {
      const error = onLocatedError(errors[0]);
      const newPath = error.path === undefined ? [] : error.path.slice(1);
      const newError = relocatedError(error, newPath);
      return { data: newError, unpathedErrors: [] };
    }

    const newErrors = errors.map(error => onLocatedError(error));
    const firstError = newErrors[0];
    const newPath = firstError.path === undefined ? [] : firstError.path.slice(1);

    const aggregateError = locatedError(new AggregateError(newErrors), undefined, newPath);

    return { data: aggregateError, unpathedErrors: [] };
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
