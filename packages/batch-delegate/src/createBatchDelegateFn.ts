import { FieldNode, getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema } from '@graphql-tools/delegate';

import { BatchDelegateOptionsFn, BatchDelegateFn, BatchDelegateOptions } from './types';

export function createBatchDelegateFn<K = any, V = any, C = K>(
  argFn: (args: ReadonlyArray<K>) => Record<string, any>,
  batchDelegateOptionsFn: BatchDelegateOptionsFn,
  dataLoaderOptions?: DataLoader.Options<K, V, C>,
  resultsFn?: (results: any, keys: ReadonlyArray<K>) => V[]
): BatchDelegateFn<K> {
  let cache: WeakMap<ReadonlyArray<FieldNode>, DataLoader<K, V, C>>;

  function createBatchFn(options: BatchDelegateOptions) {
    return async (keys: ReadonlyArray<K>) => {
      let results = await delegateToSchema({
        returnType: new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
        args: argFn(keys),
        ...batchDelegateOptionsFn(options),
      });
      results = resultsFn ? resultsFn(results, keys) : results;
      return Array.isArray(results) ? results : keys.map(() => results)
    };
  }

  function getLoader(options: BatchDelegateOptions) {
    if (!cache) {
      cache = new WeakMap();
      const batchFn = createBatchFn(options);
      const newValue = new DataLoader<K, V, C>(keys => batchFn(keys), dataLoaderOptions);
      cache.set(options.info.fieldNodes, newValue);
      return newValue;
    }

    const cachedValue = cache.get(options.info.fieldNodes);
    if (cachedValue === undefined) {
      const batchFn = createBatchFn(options);
      const newValue = new DataLoader<K, V, C>(keys => batchFn(keys), dataLoaderOptions);
      cache.set(options.info.fieldNodes, newValue);
      return newValue;
    }

    return cachedValue;
  }

  return options => {
    const loader = getLoader(options);
    return loader.load(options.key);
  };
}
