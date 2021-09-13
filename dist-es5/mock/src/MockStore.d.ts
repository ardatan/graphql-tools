import { GraphQLSchema } from 'graphql';
import { IMockStore, GetArgs, SetArgs, Ref, TypePolicy, IMocks, KeyTypeConstraints } from './types';
export declare const defaultMocks: {
  Int: () => number;
  Float: () => number;
  String: () => string;
  Boolean: () => boolean;
  ID: () => string;
};
declare type Entity = {
  [key: string]: unknown;
};
export declare class MockStore implements IMockStore {
  schema: GraphQLSchema;
  private mocks;
  private typePolicies;
  private store;
  constructor({
    schema,
    mocks,
    typePolicies,
  }: {
    schema: GraphQLSchema;
    mocks?: IMocks;
    typePolicies?: {
      [typeName: string]: TypePolicy;
    };
  });
  get<KeyT extends KeyTypeConstraints = string, ReturnKeyT extends KeyTypeConstraints = string>(
    _typeName: string | Ref<KeyT> | GetArgs<KeyT>,
    _key?:
      | KeyT
      | {
          [fieldName: string]: any;
        }
      | string
      | string[],
    _fieldName?:
      | string
      | string[]
      | {
          [fieldName: string]: any;
        }
      | string
      | {
          [argName: string]: any;
        },
    _fieldArgs?:
      | string
      | {
          [argName: string]: any;
        }
  ): unknown | Ref<ReturnKeyT>;
  set<KeyT extends KeyTypeConstraints>(
    _typeName: string | Ref<KeyT> | SetArgs<KeyT>,
    _key?:
      | KeyT
      | string
      | {
          [fieldName: string]: any;
        },
    _fieldName?:
      | string
      | {
          [fieldName: string]: any;
        }
      | unknown,
    _value?: unknown
  ): void;
  reset(): void;
  filter(key: string, predicate: (val: Entity) => boolean): Entity[];
  find(key: string, predicate: (val: Entity) => boolean): Entity | undefined;
  private getImpl;
  private setImpl;
  private normalizeValueToStore;
  private insert;
  private generateFieldValue;
  private generateFieldValueFromMocks;
  private generateKeyForType;
  private generateValueFromType;
  private getFieldType;
  private getType;
  private isKeyField;
  private getKeyFieldName;
}
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
export declare function createMockStore(options: {
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
}): IMockStore;
export {};
