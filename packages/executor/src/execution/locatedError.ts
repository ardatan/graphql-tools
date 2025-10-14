import type { ASTNode } from 'graphql';
import { locatedError as _locatedError } from 'graphql/error/locatedError';
import { GraphQLResolveInfo, Maybe } from '@graphql-tools/utils';

export function locatedError(
  rawError: unknown,
  nodes: ASTNode | ReadonlyArray<ASTNode> | null | undefined,
  path: Maybe<ReadonlyArray<string | number>>,
  info: GraphQLResolveInfo,
) {
  const error = _locatedError(rawError, nodes, path);
  error.extensions['schemaCoordinates'] = `${info.parentType.name}.${info.fieldName}`;
  return error;
}
