import { FieldNode } from 'graphql';

import DataLoader from 'dataloader';

import { IDelegateToSchemaOptions } from '@graphql-tools/delegate';

export type DataLoaderCache<K = any, V = any, C = K> = WeakMap<ReadonlyArray<FieldNode>, DataLoader<K, V, C>>;

export type BatchDelegateFn<TContext = Record<string, any>, K = any> = (
  batchDelegateOptions: BatchDelegateOptions<TContext, K>
) => any;

export type BatchDelegateOptionsFn<TContext = Record<string, any>, K = any> = (
  batchDelegateOptions: BatchDelegateOptions<TContext, K>
) => IDelegateToSchemaOptions<TContext>;

export type BatchDelegateMapKeysFn<K = any> = (keys: ReadonlyArray<K>) => Record<string, any>;

export type BatchDelegateMapResultsFn<K = any, V = any> = (results: any, keys: ReadonlyArray<K>) => Array<V>;

export interface BatchDelegateOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Omit<IDelegateToSchemaOptions<TContext>, 'args'> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  key: K;
  mapKeysFn?: BatchDelegateMapKeysFn;
  mapResultsFn?: BatchDelegateMapResultsFn;
  optionsFn?: BatchDelegateOptionsFn;
}

export interface CreateBatchDelegateFnOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Partial<Omit<IDelegateToSchemaOptions<TContext>, 'args' | 'info'>> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  mapKeysFn?: BatchDelegateMapKeysFn;
  mapResultsFn?: BatchDelegateMapResultsFn;
  optionsFn?: BatchDelegateOptionsFn;
}
