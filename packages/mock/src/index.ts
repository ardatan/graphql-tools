import { GraphQLSchema } from 'graphql';

import { IMockStore, IMocks, TypePolicy } from './types';
import { MockStore } from './MockStore';

export * from './MockStore';
export * from './addMocksToSchema';
export * from './mockServer';
export * from './types';
export * from './MockList';

/**
 * Will create `MockStore` for the given `schema`.
 *
 * A `MockStore` will generate mock values for the given schem when queried.
 *
 * It will stores generated mocks, so that, provided with same arguments
 * the returned values will be the same.
 *
 * Its API also allows to modify the stored values.
 *
 * Basic example:
 * ```ts
 * store.get('User', 1, 'name');
 * // > "Hello World"
 * store.set('User', 1, 'name', 'Alexandre');
 * store.get('User', 1, 'name');
 * // > "Alexandre"
 * ```
 *
 * The storage key will correspond to the "key field"
 * of the type. Field with name `id` or `_id` will be
 * by default considered as the key field for the type.
 * However, use `typePolicies` to precise the field to use
 * as key.
 */
export function createMockStore(options: {
  /**
   * The `schema` to based mocks on.
   */
  schema: GraphQLSchema;

  /**
   * The mocks functions to use.
   */
  mocks?: IMocks;

  typePolicies?: {
    [typeName: string]: TypePolicy;
  };
}): IMockStore {
  return new MockStore(options);
}
