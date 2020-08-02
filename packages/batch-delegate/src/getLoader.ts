import { getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema } from '@graphql-tools/delegate';

import { BatchDelegateOptions, DataLoaderCache } from './types';

const cache: DataLoaderCache = new WeakMap();

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const { valuesFromResults, lazyOptionsFn } = options;

  return async (keys: ReadonlyArray<K>) => {
    const results = await delegateToSchema({
      returnType: new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
      args: argsFromKeys(keys),
      ...(lazyOptionsFn == null ? options : lazyOptionsFn(options)),
    });

    const values = valuesFromResults == null ? results : valuesFromResults(results, keys);

    return Array.isArray(values) ? values : keys.map(() => values);
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
