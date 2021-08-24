import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema, FieldNode } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

const cache1 = new WeakMap<
  ReadonlyArray<FieldNode>,
  WeakMap<GraphQLSchema | SubschemaConfig<any, any, any, any>, Map<string, DataLoader<any, any>>>
>();

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const fieldName = options.fieldName ?? options.info.fieldName;
  const { valuesFromResults, lazyOptionsFn } = options;

  return async function batchFn(keys: ReadonlyArray<K>) {
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

function defaultCacheKeyFn(key: any) {
  if (typeof key === 'object') {
    return JSON.stringify(key);
  }
  return key;
}

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C> {
  const fieldName = options.fieldName ?? options.info.fieldName;

  let cache2 = cache1.get(options.info.fieldNodes);

  // Prevents the keys to be passed with the same structure
  const dataLoaderOptions: DataLoader.Options<any, any, any> = {
    cacheKeyFn: defaultCacheKeyFn,
    ...options.dataLoaderOptions,
  };

  if (cache2 === undefined) {
    cache2 = new WeakMap();
    cache1.set(options.info.fieldNodes, cache2);
    const loaders = new Map();
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, V, C>(batchFn, dataLoaderOptions);
    loaders.set(fieldName, loader);
    return loader;
  }

  let loaders = cache2.get(options.schema);

  if (loaders === undefined) {
    loaders = new Map();
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, V, C>(batchFn, dataLoaderOptions);
    loaders.set(fieldName, loader);
    return loader;
  }

  let loader = loaders.get(fieldName);

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(batchFn, dataLoaderOptions);
    loaders.set(fieldName, loader);
  }

  return loader;
}
