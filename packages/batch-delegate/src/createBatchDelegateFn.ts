import { FieldNode, getNamedType, GraphQLOutputType, GraphQLList } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema } from '@graphql-tools/delegate';

import { BatchDelegateOptionsFn, BatchDelegateFn, BatchDelegateOptions } from './types';

export function createBatchDelegateFn<K = any, V = any, C = K>(
  argFn: (args: ReadonlyArray<K>) => Record<string, any>,
  batchDelegateOptionsFn: BatchDelegateOptionsFn,
  mappingFn?: (keys: ReadonlyArray<K>, results: any) => V[],
  dataLoaderOptions?: DataLoader.Options<K, V, C>
): BatchDelegateFn<K> {
  let cache: WeakMap<ReadonlyArray<FieldNode>, DataLoader<K, V, C>>;

  function createBatchFn(options: BatchDelegateOptions) {
    return async (keys: ReadonlyArray<K>) => {
      const results = await delegateToSchema({
        returnType: new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
        args: argFn(keys),
        ...batchDelegateOptionsFn(options),
      });
      return mappingFn ? mappingFn(keys, results) : results;
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
