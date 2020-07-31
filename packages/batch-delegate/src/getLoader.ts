import DataLoader from 'dataloader';

import { delegateToSchema } from '@graphql-tools/delegate';

import { BatchDelegateOptions, DataLoaderCache } from './types';

const cache: DataLoaderCache = new WeakMap();

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const mapKeysFn = options.mapKeysFn ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const { mapResultsFn, optionsFn } = options;

  return async (keys: ReadonlyArray<K>) => {
    const delegateOptions = {
      args: mapKeysFn(keys),
      ...(optionsFn != null ? optionsFn(options) : options),
    };

    delegateOptions.info = {
      ...delegateOptions.info,
      returnType: undefined,
    };

    let results = await delegateToSchema(delegateOptions);

    if (mapResultsFn != null) {
      results = mapResultsFn(results, keys);
    }

    return Array.isArray(results) ? results : keys.map(() => results);
  };
}

function createLoader<K = any, V = any, C = K>(options: BatchDelegateOptions): DataLoader<K, V, C> {
  const batchFn = createBatchFn(options);
  const newValue = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
  cache.set(options.info.fieldNodes, newValue);
  return newValue;
}

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions): DataLoader<K, V, C> {
  const cachedValue = cache.get(options.info.fieldNodes);
  if (cachedValue === undefined) {
    return createLoader(options);
  }

  return cachedValue;
}
