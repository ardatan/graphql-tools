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

export interface BatchDelegateOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Omit<IDelegateToSchemaOptions<TContext>, 'args'> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  key: K;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
  lazyOptionsFn?: BatchDelegateOptionsFn;
}

export interface CreateBatchDelegateFnOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Partial<Omit<IDelegateToSchemaOptions<TContext>, 'args' | 'info'>> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
  lazyOptionsFn?: (batchDelegateOptions: BatchDelegateOptions<TContext, K>) => IDelegateToSchemaOptions<TContext>;
}
