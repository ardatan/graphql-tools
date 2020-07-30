import DataLoader from 'dataloader';

import {
  CreateBatchDelegateFnOptions,
  BatchDelegateOptionsFn,
  BatchDelegateFn,
  BatchDelegateArgsFn,
  BatchDelegateResultsFn,
  DataLoaderCache,
} from './types';

import { getLoader } from './getLoader';

export function createBatchDelegateFn<K = any, V = any, C = K>(
  optionsOrArgsFn: CreateBatchDelegateFnOptions | BatchDelegateArgsFn,
  optionsFn?: BatchDelegateOptionsFn,
  dataLoaderOptions?: DataLoader.Options<K, V, C>,
  resultsFn?: BatchDelegateResultsFn
): BatchDelegateFn<K> {
  return typeof optionsOrArgsFn === 'function'
    ? createBatchDelegateFnImpl({
        argsFn: optionsOrArgsFn,
        optionsFn,
        dataLoaderOptions,
        resultsFn,
      })
    : createBatchDelegateFnImpl(optionsOrArgsFn);
}

function createBatchDelegateFnImpl<K = any, V = any, C = K>(options: CreateBatchDelegateFnOptions): BatchDelegateFn<K> {
  let cache: DataLoaderCache<K, V, C>;

  return batchDelegateOptions => {
    const loader = getLoader(cache, {
      ...options,
      ...batchDelegateOptions,
    });
    return loader.load(batchDelegateOptions.key);
  };
}
