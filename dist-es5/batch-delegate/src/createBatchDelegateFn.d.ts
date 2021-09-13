import DataLoader from 'dataloader';
import { CreateBatchDelegateFnOptions, BatchDelegateOptionsFn, BatchDelegateFn } from './types';
export declare function createBatchDelegateFn<K = any, V = any, C = K>(
  optionsOrArgsFromKeys: CreateBatchDelegateFnOptions | ((keys: ReadonlyArray<K>) => Record<string, any>),
  lazyOptionsFn?: BatchDelegateOptionsFn,
  dataLoaderOptions?: DataLoader.Options<K, V, C>,
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>
): BatchDelegateFn<K>;
