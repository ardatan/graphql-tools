import { locatedError as _locatedError, ASTNode, GraphQLError, Source, versionInfo } from 'graphql';
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
];

function isGraphQLErrorLike(error: any) {
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
    options?.extensions,
  );
}

type SchemaCoordinateInfo = { fieldName: string; parentType: { name: string } };
export const ERROR_EXTENSION_SCHEMA_COORDINATE = Symbol.for('graphql.error.schemaCoordinate');
function addSchemaCoordinateToError(error: GraphQLError, info: SchemaCoordinateInfo): void {
  // @ts-expect-error extensions can't be Symbol in official GraphQL Error type
  error.extensions[ERROR_EXTENSION_SCHEMA_COORDINATE] = `${info.parentType.name}.${info.fieldName}`;
}

export function locatedError(
  rawError: unknown,
  nodes: ASTNode | ReadonlyArray<ASTNode> | undefined,
  path: Maybe<ReadonlyArray<string | number>>,
  info: SchemaCoordinateInfo | false | null | undefined,
) {
  const error = _locatedError(rawError, nodes, path);

  if (info) {
    addSchemaCoordinateToError(error, info);
  }

  return error;
}

export function relocatedError(
  originalError: GraphQLError,
  path?: ReadonlyArray<string | number>,
  info?: SchemaCoordinateInfo | false | null | undefined,
): GraphQLError {
  const error = createGraphQLError(originalError.message, {
    nodes: originalError.nodes,
    source: originalError.source,
    positions: originalError.positions,
    path: path == null ? originalError.path : path,
    originalError,
    extensions: originalError.extensions,
  });

  if (info) {
    addSchemaCoordinateToError(error, info);
  }

  return error;
}
