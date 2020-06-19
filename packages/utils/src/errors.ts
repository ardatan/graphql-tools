import { GraphQLError } from 'graphql';

export const ERROR_SYMBOL = Symbol('subschemaErrors');
export const DEPTH_SYMBOL = Symbol('proxiedResultDepth');

export function toGraphQLErrors(
  errors: ReadonlyArray<GraphQLError>,
  sourcePath: Array<string | number>
): Array<GraphQLError> {
  return errors.map(error => {
    const relativePath = error.path?.slice(1) || [];
    return relocatedError(error, sourcePath.concat(relativePath));
  });
}

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

export function getErrorsByPathSegment(
  errors: Array<GraphQLError>,
  depth: number
): Record<string, Array<GraphQLError>> {
  return errors.reduce((acc, error) => {
    const pathSegment = (error.path && error.path[depth]) ?? '__root';

    if (pathSegment in acc) {
      acc[pathSegment].push(error);
    } else {
      acc[pathSegment] = [error];
    }

    return acc;
  }, Object.create(null));
}

export function setErrors(result: any, map: Record<string, Array<GraphQLError>>) {
  result[ERROR_SYMBOL] = map;
}

export function getErrors(result: any, pathSegment: string | number): Array<GraphQLError> {
  const proxiedErrors: Record<string, Array<GraphQLError>> = result[ERROR_SYMBOL];

  if (proxiedErrors == null) {
    return null;
  }

  return proxiedErrors[pathSegment] ?? [];
}

export function setDepth(result: any, depth: number) {
  result[DEPTH_SYMBOL] = depth;
}

export function getDepth(result: any): number {
  return result[DEPTH_SYMBOL];
}
