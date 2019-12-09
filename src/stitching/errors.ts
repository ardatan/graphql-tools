import {
  GraphQLError,
  ASTNode,
} from 'graphql';

export function relocatedError(
  originalError: Error | GraphQLError,
  nodes: ReadonlyArray<ASTNode>,
  path: ReadonlyArray<string | number>
): GraphQLError {
  if (Array.isArray((originalError as GraphQLError).path)) {
    return new GraphQLError(
      (originalError as GraphQLError).message,
      (originalError as GraphQLError).nodes,
      (originalError as GraphQLError).source,
      (originalError as GraphQLError).positions,
      path ? path : (originalError as GraphQLError).path,
      (originalError as GraphQLError).originalError,
      (originalError as GraphQLError).extensions
    );
  }

  return new GraphQLError(
    originalError && originalError.message,
    (originalError && (originalError as any).nodes) || nodes,
    originalError && (originalError as any).source,
    originalError && (originalError as any).positions,
    path,
    originalError,
  );
}

export function slicedError(originalError: GraphQLError) {
  return relocatedError(
    originalError,
    originalError.nodes,
    originalError.path ? originalError.path.slice(1) : undefined
  );
}


export function getErrorsByPathSegment(errors: ReadonlyArray<GraphQLError>): Record<string, Array<GraphQLError>> {
  const record = Object.create(null);
  errors.forEach(error => {
    if (!error.path || error.path.length < 2) {
      return;
    }

    const pathSegment = error.path[1];

    const current = record[pathSegment] || [];
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

export function combineErrors(errors: ReadonlyArray<GraphQLError>): GraphQLError | CombinedError {
  if (errors.length === 1) {
    return new GraphQLError(
      errors[0].message,
      errors[0].nodes,
      errors[0].source,
      errors[0].positions,
      errors[0].path,
      errors[0].originalError,
      errors[0].extensions
    );
  } else {
    return new CombinedError(errors.map(error => error.message).join('\n'), errors);
  }
}
