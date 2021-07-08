import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

const cache1: WeakMap<
  any,
  WeakMap<GraphQLSchema | SubschemaConfig<any, any, any, any>, Record<string, DataLoader<any, any>>>
> = new WeakMap();

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const fieldName = options.fieldName ?? options.info.fieldName;
  const { valuesFromResults, lazyOptionsFn } = options;

  return async (keys: ReadonlyArray<K>) => {
    const results = await delegateToSchema({
      returnType: new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
      onLocatedError: originalError => {
        if (originalError.path == null) {
          return originalError;
        }

        const [pathFieldName, pathNumber] = originalError.path;

        if (pathFieldName !== fieldName) {
          return originalError;
        }
        const pathNumberType = typeof pathNumber;
        if (pathNumberType !== 'number') {
          return originalError;
        }

        return relocatedError(originalError, originalError.path.slice(0, 0).concat(originalError.path.slice(2)));
      },
      args: argsFromKeys(keys),
      ...(lazyOptionsFn == null ? options : lazyOptionsFn(options)),
    });

    if (results instanceof Error) {
      return keys.map(() => results);
    }

    const values = valuesFromResults == null ? results : valuesFromResults(results, keys);

    return Array.isArray(values) ? values : keys.map(() => values);
  };
}

const cacheKeyFn = (key: any) => (typeof key === 'object' ? JSON.stringify(key) : key);

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C> {
  const fieldName = options.fieldName ?? options.info.fieldName;

  // Context is needed for better caching
  const cache1Key = options.context ?? options.info.fieldNodes;

  let cache2: WeakMap<GraphQLSchema | SubschemaConfig, Record<string, DataLoader<K, V, C>>> | undefined =
    cache1.get(cache1Key);

  // Prevents the keys to be passed with the same structure
  const dataLoaderOptions: DataLoader.Options<any, any, any> = {
    cacheKeyFn,
    ...options.dataLoaderOptions,
  };

  if (cache2 === undefined) {
    cache2 = new WeakMap();
    cache1.set(cache1Key, cache2);
    const loaders = Object.create(null);
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, V, C>(keys => batchFn(keys), dataLoaderOptions);
    loaders[fieldName] = loader;
    return loader;
  }

  let loaders = cache2.get(options.schema);

  if (loaders === undefined) {
    loaders = Object.create(null) as Record<string, DataLoader<K, V, C>>;
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, V, C>(keys => batchFn(keys), dataLoaderOptions);
    loaders[fieldName] = loader;
    return loader;
  }

  let loader = loaders[fieldName];

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(keys => batchFn(keys), dataLoaderOptions);
    loaders[fieldName] = loader;
  }

  return loader;
}
