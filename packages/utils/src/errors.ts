import { ASTNode, GraphQLError, Source, versionInfo } from 'graphql';
import { Maybe } from './types.js';

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
  extensions?: any;
}

export function createGraphQLError(message: string, options?: GraphQLErrorOptions): GraphQLError {
  if (versionInfo.major >= 17) {
    return new (GraphQLError as any)(message, options);
  }
  return new (GraphQLError as any)(
    message,
    options?.nodes,
    options?.source,
    options?.positions,
    options?.path,
    options?.originalError,
    options?.extensions
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
