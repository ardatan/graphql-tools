/**
 * Shared GraphQL completion primitives used by classic and planned paths.
 * Traversal / scheduling stay in execute.ts; semantics live here so nullability,
 * leaf serialize, and item error localization stay one source of truth.
 */
import { GraphQLError, type FieldNode, type GraphQLLeafType } from 'graphql';
import { inspect, locatedError, pathToArray, type Path } from '@graphql-tools/utils';
import { coerceError } from './coerceError.js';

/**
 * Complete a Scalar or Enum by serializing to a valid value.
 * Strips GraphQLError extensions (CRITICAL_ERROR etc.) so classic and planned
 * match: only the item nulls, sibling fields survive.
 */
export function completeLeafValue(returnType: GraphQLLeafType, result: unknown): unknown {
  let serializedResult: unknown;

  // Note: We transform GraphQLError to Error in order to be consistent with
  // how non-null checks work later on.
  // See https://github.com/kamilkisiela/graphql-hive/pull/2299
  // See https://github.com/n1ru4l/envelop/issues/1808
  try {
    serializedResult = returnType.serialize(result);
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new Error(err.message);
    }
    throw err;
  }

  if (serializedResult == null) {
    throw new Error(
      `Expected \`${inspect(returnType)}.serialize(${inspect(result)})\` to ` +
        `return non-nullable value, returned: ${inspect(serializedResult)}`,
    );
  }
  return serializedResult;
}

/**
 * Locate a list-item failure like classic `completeListItemValue`:
 * fieldNodes + item path + optional schema coordinate.
 * Preserves an existing GraphQLError path (child field bubble).
 */
export function locateListItemError(
  rawError: unknown,
  fieldNodes: ReadonlyArray<FieldNode>,
  itemPath: Path,
  schemaCoordinate: { fieldName: string; parentType: { name: string } } | false | null | undefined,
): GraphQLError {
  return locatedError(coerceError(rawError), fieldNodes, pathToArray(itemPath), schemaCoordinate);
}
