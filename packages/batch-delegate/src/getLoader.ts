import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions, DataLoaderCache } from './types';

const cache1: DataLoaderCache = new WeakMap();

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const { valuesFromResults, lazyOptionsFn } = options;

  return async (keys: ReadonlyArray<K>) => {
    const results = await delegateToSchema({
      returnType: new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
      onLocatedError: originalError =>
        relocatedError(originalError, originalError.path.slice(0, 0).concat(originalError.path.slice(2))),
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

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions): DataLoader<K, V, C> {
  let cache2: WeakMap<GraphQLSchema | SubschemaConfig, DataLoader<K, V, C>> = cache1.get(options.info.fieldNodes);
  let loader: DataLoader<K, V, C>;

  if (cache2 === undefined) {
    const batchFn = createBatchFn(options);
    cache2 = new WeakMap();
    cache1.set(options.info.fieldNodes, cache2);
    loader = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
    cache2.set(options.schema, loader);
    return loader;
  }

  loader = cache2.get(options.schema);

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
    cache2.set(options.schema, loader);
    return loader;
  }

  return loader;
}
