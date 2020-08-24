import { GraphQLError } from 'graphql';

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
