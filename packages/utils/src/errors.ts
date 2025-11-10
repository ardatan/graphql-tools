import {
  GraphQLError as _GraphQLError,
  locatedError as _locatedError,
  ASTNode,
  GraphQLErrorExtensions,
  Source,
  versionInfo,
} from 'graphql';
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

function toNormalizedOptions(args: any): GraphQLErrorOptions {
  const firstArg = args[0];

  if (firstArg == null || 'kind' in firstArg || 'length' in firstArg) {
    return {
      nodes: firstArg,
      source: args[1],
      positions: args[2],
      path: args[3],
      originalError: args[4],
      extensions: args[5],
      coordinate: args[6],
    };
  }

  return firstArg;
}

export class GraphQLError extends _GraphQLError {
  readonly coordinate?: string;

  constructor(message: string, options?: Maybe<GraphQLErrorOptions>);
  /**
   * @deprecated Please use the `GraphQLErrorOptions` constructor overload instead.
   */
  constructor(
    message: string,
    nodes?: ReadonlyArray<ASTNode> | ASTNode | null,
    source?: Maybe<Source>,
    positions?: Maybe<ReadonlyArray<number>>,
    path?: Maybe<ReadonlyArray<string | number>>,
    originalError?: Maybe<
      Error & {
        readonly extensions?: unknown;
      }
    >,
    extensions?: Maybe<GraphQLErrorExtensions>,
    coordinate?: Maybe<string>,
  );

  constructor(message: string, ...args: any) {
    const options = toNormalizedOptions(args);
    super(message, ...args);
    this.coordinate = options.coordinate;
  }
}

export function isGraphQLErrorLike(error: any) {
  return (
    error != null &&
    typeof error === 'object' &&
    Object.keys(error).every(key => possibleGraphQLErrorProperties.includes(key))
  );
}

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
  if (versionInfo.major >= 16) {
    return new (GraphQLError as any)(message, options);
  }
  return new (GraphQLError as any)(
    message,
    options?.nodes,
    options?.source,
    options?.positions,
    options?.path,
    options?.originalError,
    options?.extensions,
    options?.coordinate,
  );
}

type SchemaCoordinateInfo = { fieldName: string; parentType: { name: string } };

export function getSchemaCoordinate(error: GraphQLError): string | undefined {
  return error.coordinate;
}

export function locatedError(
  rawError: unknown,
  nodes: ASTNode | ReadonlyArray<ASTNode> | undefined,
  path: Maybe<ReadonlyArray<string | number>>,
  info: SchemaCoordinateInfo | false | null | undefined,
): GraphQLError {
  const error = _locatedError(rawError, nodes, path) as GraphQLError;

  // `graphql` locatedError is only changing path and nodes if it is not already defined
  if (!error.coordinate && info) {
    // @ts-expect-error coordinate is readonly, but we don't want to recreate it just to add coordinate
    error.coordinate = `${info.parentType.name}.${info.fieldName}`;
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
