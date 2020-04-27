import { GraphQLError } from 'graphql';

import { ERROR_SYMBOL } from './symbols';

export function relocatedError(originalError: GraphQLError, path: ReadonlyArray<string | number>): GraphQLError {
  return new GraphQLError(
    originalError.message,
    originalError.nodes,
    originalError.source,
    originalError.positions,
    path != null ? path : originalError.path,
    originalError.originalError,
    originalError.extensions
  );
}

export function slicedError(originalError: GraphQLError) {
  return relocatedError(originalError, originalError.path != null ? originalError.path.slice(1) : undefined);
}

export function getErrorsByPathSegment(errors: ReadonlyArray<GraphQLError>): Record<string, Array<GraphQLError>> {
  const record = Object.create(null);
  errors.forEach(error => {
    if (!error.path || error.path.length < 2) {
      return;
    }

    const pathSegment = error.path[1];

    const current = pathSegment in record ? record[pathSegment] : [];
    current.push(slicedError(error));
    record[pathSegment] = current;
  });

  return record;
}

class CombinedError extends GraphQLError {
  public errors: ReadonlyArray<Error>;
  constructor(message: string, errors: ReadonlyArray<Error>) {
    super(message, undefined, undefined, undefined, undefined, undefined, undefined);
    this.errors = errors;
  }
}

export function combineErrors(errors: ReadonlyArray<GraphQLError>): Error | GraphQLError {
  if (errors.length === 1) {
    return errors[0].originalError != null ? errors[0].originalError : errors[0];
  }

  return new CombinedError(
    errors.map(error => error.message).join('\n'),
    errors.map(error => (error.originalError != null ? error.originalError : error))
  );
}

export function setErrors(result: any, errors: Array<GraphQLError>) {
  result[ERROR_SYMBOL] = errors;
}

export function getErrors(result: any, pathSegment: string): Array<GraphQLError> {
  const errors = result != null ? result[ERROR_SYMBOL] : result;

  if (!Array.isArray(errors)) {
    return null;
  }

  const fieldErrors = [];

  for (const error of errors) {
    if (!error.path || error.path[0] === pathSegment) {
      fieldErrors.push(error);
    }
  }

  return fieldErrors;
}
