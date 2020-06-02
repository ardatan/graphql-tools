import { GraphQLError } from 'graphql';

export const ERROR_SYMBOL = Symbol('subschemaErrors');

export function relocatedError(originalError: GraphQLError, path?: ReadonlyArray<string | number>): GraphQLError {
  return new GraphQLError(
    originalError.message,
    originalError.nodes,
    originalError.source,
    originalError.positions,
    path === null ? undefined : path === undefined ? originalError.path : path,
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

export class CombinedError extends GraphQLError {
  public errors: ReadonlyArray<Error>;
  constructor(errors: ReadonlyArray<Error>) {
    const message = errors.map(error => error.message).join('\n');
    super(message, undefined, undefined, undefined, undefined, undefined, undefined);
    const actualErrors = errors.map((error: GraphQLError) =>
      error.originalError != null ? error.originalError : error
    );
    this.errors = actualErrors;
  }

  [Symbol.iterator]() {
    return this.errors[Symbol.iterator]();
  }
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
