import { GraphQLError, ASTNode } from 'graphql';

import { ERROR_SYMBOL } from './symbols';

export function relocatedError(
  originalError: Error | GraphQLError,
  nodes: ReadonlyArray<ASTNode>,
  path: ReadonlyArray<string | number>,
): GraphQLError {
  if (Array.isArray((originalError as GraphQLError).path)) {
    return new GraphQLError(
      (originalError as GraphQLError).message,
      (originalError as GraphQLError).nodes,
      (originalError as GraphQLError).source,
      (originalError as GraphQLError).positions,
      path != null ? path : (originalError as GraphQLError).path,
      (originalError as GraphQLError).originalError,
      (originalError as GraphQLError).extensions,
    );
  }

  if (originalError == null) {
    return new GraphQLError(
      undefined,
      nodes,
      undefined,
      undefined,
      path,
      originalError,
    );
  }

  return new GraphQLError(
    originalError.message,
    (originalError as GraphQLError).nodes != null
      ? (originalError as GraphQLError).nodes
      : nodes,
    (originalError as GraphQLError).source,
    (originalError as GraphQLError).positions,
    path,
    originalError,
  );
}

export function slicedError(originalError: GraphQLError) {
  return relocatedError(
    originalError,
    originalError.nodes,
    originalError.path != null ? originalError.path.slice(1) : undefined,
  );
}

export function getErrorsByPathSegment(
  errors: ReadonlyArray<GraphQLError>,
): Record<string, Array<GraphQLError>> {
  const record = Object.create(null);
  errors.forEach((error) => {
    if (!error.path || error.path.length < 2) {
      return;
    }

    const pathSegment = error.path[1];

    const current = record[pathSegment] != null ? record[pathSegment] : [];
    current.push(slicedError(error));
    record[pathSegment] = current;
  });

  return record;
}

class CombinedError extends Error {
  public errors: ReadonlyArray<GraphQLError>;
  constructor(message: string, errors: ReadonlyArray<GraphQLError>) {
    super(message);
    this.errors = errors;
  }
}

export function combineErrors(
  errors: ReadonlyArray<GraphQLError>,
): GraphQLError | CombinedError {
  if (errors.length === 1) {
    return new GraphQLError(
      errors[0].message,
      errors[0].nodes,
      errors[0].source,
      errors[0].positions,
      errors[0].path,
      errors[0].originalError,
      errors[0].extensions,
    );
  }

  return new CombinedError(
    errors.map((error) => error.message).join('\n'),
    errors,
  );
}

export function setErrors(result: any, errors: Array<GraphQLError>) {
  result[ERROR_SYMBOL] = errors;
}

export function getErrors(
  result: any,
  pathSegment: string,
): Array<GraphQLError> {
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
