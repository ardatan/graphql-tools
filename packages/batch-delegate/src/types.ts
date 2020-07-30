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

export type BatchDelegateArgsFn<K = any> = (keys: ReadonlyArray<K>) => Record<string, any>;

export type BatchDelegateResultsFn<K = any, V = any> = (results: any, keys: ReadonlyArray<K>) => Array<V>;

export interface BatchDelegateOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Omit<IDelegateToSchemaOptions<TContext>, 'args'> {
  key: K;
  argsFn?: BatchDelegateArgsFn;
  optionsFn?: BatchDelegateOptionsFn;
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  resultsFn?: BatchDelegateResultsFn;
}

export interface CreateBatchDelegateFnOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Partial<Omit<IDelegateToSchemaOptions<TContext>, 'args' | 'info'>> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  argsFn?: BatchDelegateArgsFn;
  resultsFn?: BatchDelegateResultsFn;
  optionsFn?: BatchDelegateOptionsFn;
}

export interface BatchDelegateToSchema<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Omit<IDelegateToSchemaOptions<TContext>, 'schema' | 'args'> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  argsFn?: BatchDelegateArgsFn;
  resultsFn?: BatchDelegateResultsFn;
  optionsFn?: BatchDelegateOptionsFn;
}
