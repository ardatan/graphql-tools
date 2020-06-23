import { GraphQLError } from 'graphql';

import AggregateError from '@ardatan/aggregate-error';
import { getErrorsByPathSegment, relocatedError } from '@graphql-tools/utils';

export function handleNull(errors: ReadonlyArray<GraphQLError>) {
  if (errors.length) {
    if (errors.some(error => !error.path || error.path.length < 2)) {
      if (errors.length > 1) {
        const combinedError = new AggregateError(errors);
        return combinedError;
      }
      const error = errors[0];
      return error.originalError || relocatedError(error, null);
    } else if (errors.some(error => typeof error.path[1] === 'string')) {
      const childErrors = getErrorsByPathSegment(errors);

      const result = {};
      Object.keys(childErrors).forEach(pathSegment => {
        result[pathSegment] = handleNull(childErrors[pathSegment]);
      });

      return result;
    }

    const childErrors = getErrorsByPathSegment(errors);

    const result: Array<any> = [];
    Object.keys(childErrors).forEach(pathSegment => {
      result.push(handleNull(childErrors[pathSegment]));
    });

    return result;
  }

  return null;
}
