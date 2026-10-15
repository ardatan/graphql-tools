import { locatedError as _locatedError, ASTNode, GraphQLError, Source } from 'graphql';
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
  coordinate?: string;
}

declare module 'graphql' {
  interface GraphQLError {
    /**
     * An optional schema coordinate (e.g. "MyType.myField") associated with this error.
     */
    readonly coordinate?: string;
  }
}

const possibleGraphQLErrorProperties = [
  'message',
  'locations',
  'path',
  'nodes',
  'source',
  'positions',
  'originalError',
  'name',
  'stack',
  'extensions',
  'coordinate',
];

export function isGraphQLErrorLike(error: any) {
  return (
    error != null &&
    typeof error === 'object' &&
    Object.keys(error).every(key => possibleGraphQLErrorProperties.includes(key))
  );
}

/**
 * Thin helper around `new GraphQLError(message, options)`.
 * Prefer `new GraphQLError` for ordinary errors; this remains for the experimental
 * `coordinate` field and for coercing GraphQLError-like plain objects used as `originalError`.
 */
export function createGraphQLError(message: string, options?: GraphQLErrorOptions): GraphQLError {
  if (
    options?.originalError &&
    !(options.originalError instanceof Error) &&
    isGraphQLErrorLike(options.originalError)
  ) {
    options.originalError = createGraphQLError(
      (options.originalError as any).message,
      options.originalError,
    );
  }

  const error: GraphQLError = new GraphQLError(message, options);

  if (options?.coordinate && error.coordinate == null) {
    Object.defineProperties(error, {
      coordinate: { value: options.coordinate, enumerable: true, configurable: true },
    });
  }

  return error;
}

type SchemaCoordinateInfo = { fieldName: string; parentType: { name: string } };

export function getSchemaCoordinate(error: GraphQLError): string | undefined {
  return error.coordinate;
}

export function locatedError(
  rawError: unknown,
  nodes: ASTNode | ReadonlyArray<ASTNode> | undefined,
  path: Maybe<ReadonlyArray<string | number>>,
  info?: SchemaCoordinateInfo | false | null | undefined,
): GraphQLError {
  const error = _locatedError(rawError, nodes, path) as GraphQLError;

  // `graphql` locatedError is only changing path and nodes if it is not already defined
  if (!error.coordinate && info && error.coordinate == null) {
    const coordinate = `${info.parentType.name}.${info.fieldName}`;
    Object.defineProperties(error, {
      coordinate: { value: coordinate, enumerable: true, configurable: true },
    });
  }

  return error;
}

export function relocatedError(
  originalError: GraphQLError,
  path?: ReadonlyArray<string | number>,
  info?: SchemaCoordinateInfo | false | null | undefined,
): GraphQLError {
  return createGraphQLError(originalError.message, {
    nodes: originalError.nodes,
    source: originalError.source,
    positions: originalError.positions,
    path: path == null ? originalError.path : path,
    originalError,
    extensions: originalError.extensions,
    coordinate: info ? `${info.parentType.name}.${info.fieldName}` : undefined,
  });
}
