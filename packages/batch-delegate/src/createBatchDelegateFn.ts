import DataLoader from 'dataloader';

import {
  CreateBatchDelegateFnOptions,
  BatchDelegateOptionsFn,
  BatchDelegateFn,
  BatchDelegateMapKeysFn,
  BatchDelegateMapResultsFn,
} from './types';

import { getLoader } from './getLoader';

export function createBatchDelegateFn<K = any, V = any, C = K>(
  optionsOrMapKeysFn: CreateBatchDelegateFnOptions | BatchDelegateMapKeysFn,
  optionsFn?: BatchDelegateOptionsFn,
  dataLoaderOptions?: DataLoader.Options<K, V, C>,
  mapResultsFn?: BatchDelegateMapResultsFn
): BatchDelegateFn<K> {
  return typeof optionsOrMapKeysFn === 'function'
    ? createBatchDelegateFnImpl({
        mapKeysFn: optionsOrMapKeysFn,
        optionsFn,
        dataLoaderOptions,
        mapResultsFn,
      })
    : createBatchDelegateFnImpl(optionsOrMapKeysFn);
}

function createBatchDelegateFnImpl<K = any>(options: CreateBatchDelegateFnOptions): BatchDelegateFn<K> {
  return batchDelegateOptions => {
    const loader = getLoader({
      ...options,
      ...batchDelegateOptions,
    });
    return loader.load(batchDelegateOptions.key);
  };
}
