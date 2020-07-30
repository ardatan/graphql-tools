import { getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema } from '@graphql-tools/delegate';

import { BatchDelegateOptions, DataLoaderCache } from './types';

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFn = options.argsFn ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const { resultsFn, optionsFn } = options;

  return async (keys: ReadonlyArray<K>) => {
    let results = await delegateToSchema({
      returnType: new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
      args: argsFn(keys),
      ...(optionsFn != null ? optionsFn(options) : options),
    });

    if (resultsFn != null) {
      results = resultsFn(results, keys);
    }

    return Array.isArray(results) ? results : keys.map(() => results);
  };
}

function createLoader<K = any, V = any, C = K>(
  cache: DataLoaderCache,
  options: BatchDelegateOptions
): DataLoader<K, V, C> {
  const batchFn = createBatchFn(options);
  const newValue = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
  cache.set(options.info.fieldNodes, newValue);
  return newValue;
}

export function getLoader<K = any, V = any, C = K>(
  cache: DataLoaderCache,
  options: BatchDelegateOptions
): DataLoader<K, V, C> {
  if (!cache) {
    cache = new WeakMap();
    return createLoader(cache, options);
  }

  const cachedValue = cache.get(options.info.fieldNodes);
  if (cachedValue === undefined) {
    return createLoader(cache, options);
  }

  return cachedValue;
}
