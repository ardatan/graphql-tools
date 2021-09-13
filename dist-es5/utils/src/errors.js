import { GraphQLError } from 'graphql';
export function relocatedError(originalError, path) {
    return new GraphQLError(originalError.message, originalError.nodes, originalError.source, originalError.positions, path === null ? undefined : path === undefined ? originalError.path : path, originalError.originalError, originalError.extensions);
}
