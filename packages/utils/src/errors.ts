import { ASTNode, GraphQLError, GraphQLErrorExtensions, Source, versionInfo } from 'graphql';
import { Maybe } from './types';

interface GraphQLErrorOptions {
  nodes?: ReadonlyArray<ASTNode> | ASTNode | null;
  source?: Maybe<Source>;
  positions?: Maybe<ReadonlyArray<number>>;
  path?: Maybe<ReadonlyArray<string | number>>;
  originalError?: Maybe<
    Error & {
      readonly extensions?: unknown;
    }
  >;
  extensions?: Maybe<GraphQLErrorExtensions>;
}

export function createGraphQLError(message: string, options: GraphQLErrorOptions): GraphQLError {
  if (versionInfo.major > 15) {
    const error = new GraphQLError(message, options);
    Object.defineProperty(error, 'extensions', {
      value: options.extensions || {},
    });
    return error;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new GraphQLError(
    message,
    options.nodes,
    options.source,
    options.positions,
    options.path,
    options.originalError,
    options.extensions
  );
}

export function relocatedError(originalError: GraphQLError, path?: ReadonlyArray<string | number>): GraphQLError {
  return createGraphQLError(originalError.message, {
    nodes: originalError.nodes,
    source: originalError.source,
    positions: originalError.positions,
    path: path == null ? originalError.path : path,
    originalError,
    extensions: originalError.extensions,
  });
}
