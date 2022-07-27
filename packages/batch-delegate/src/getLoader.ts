import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema, FieldNode } from '@graphql-tools/graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { memoize3, relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types.js';

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

const getLoadersMap = memoize3(function getLoadersMap<K, V, C>(
  _context: Record<string, any>,
  _fieldNodes: readonly FieldNode[],
  _schema: GraphQLSchema | SubschemaConfig<any, any, any, any>
) {
  return new Map<string, DataLoader<K, V, C>>();
});

const GLOBAL_CONTEXT = {};

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C> {
  const { schema, fieldName, context, info, dataLoaderOptions } = options;
  const targetFieldName = fieldName ?? info.fieldName;
  const loaders = getLoadersMap<K, V, C>(context ?? GLOBAL_CONTEXT, info.fieldNodes, schema);

  let loader = loaders.get(targetFieldName);

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(batchFn, {
      // Prevents the keys to be passed with the same structure
      cacheKeyFn: defaultCacheKeyFn,
      ...dataLoaderOptions,
    });
    loaders.set(targetFieldName, loader);
  }

  return loader;
}
