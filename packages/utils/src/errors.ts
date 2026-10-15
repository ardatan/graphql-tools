import { locatedError as _locatedError, ASTNode, GraphQLError } from 'graphql';
import { Maybe } from './types.js';

declare module 'graphql' {
  interface GraphQLError {
    /**
     * An optional schema coordinate (e.g. "MyType.myField") associated with this error.
     */
    readonly coordinate?: string;
  }
}

type SchemaCoordinateInfo = { fieldName: string; parentType: { name: string } };

function withCoordinate(error: GraphQLError, coordinate: string | undefined): GraphQLError {
  if (coordinate != null && error.coordinate == null) {
    Object.defineProperties(error, {
      coordinate: { value: coordinate, enumerable: true, configurable: true },
    });
  }
  return error;
}

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
  return withCoordinate(error, info ? `${info.parentType.name}.${info.fieldName}` : undefined);
}

export function relocatedError(
  originalError: GraphQLError,
  path?: ReadonlyArray<string | number>,
  info?: SchemaCoordinateInfo | false | null | undefined,
): GraphQLError {
  return withCoordinate(
    new GraphQLError(originalError.message, {
      nodes: originalError.nodes,
      source: originalError.source,
      positions: originalError.positions,
      path: path == null ? originalError.path : path,
      originalError,
      extensions: originalError.extensions,
    }),
    info ? `${info.parentType.name}.${info.fieldName}` : originalError.coordinate,
  );
}
