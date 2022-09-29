import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema, print } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { memoize1, memoize2, relocatedError } from '@graphql-tools/utils';

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

const getLoadersMap = memoize2(function getLoadersMap<K, V, C>(
  _context: Record<string, any>,
  _schema: GraphQLSchema | SubschemaConfig<any, any, any, any>
) {
  return new Map<string, DataLoader<K, V, C>>();
});

const GLOBAL_CONTEXT = {};

const memoizedJsonStringify = memoize1(function jsonStringify(value: any) {
  return JSON.stringify(value);
});

const memoizedPrint = memoize1(print);

function defaultCacheKeyFn(key: any) {
  if (typeof key === 'object') {
    return memoizedJsonStringify(key);
  }
  return key;
}

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C> {
  const {
    schema,
    context,
    info,
    fieldName = info.fieldName,
    dataLoaderOptions,
    fieldNodes = info.fieldNodes,
    selectionSet = fieldNodes[0].selectionSet,
  } = options;
  const loaders = getLoadersMap<K, V, C>(context ?? GLOBAL_CONTEXT, schema);

  let cacheKey = fieldName;

  if (selectionSet != null) {
    cacheKey += memoizedPrint(selectionSet);
  }

  let loader = loaders.get(cacheKey);

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(batchFn, {
      // Prevents the keys to be passed with the same structure
      cacheKeyFn: defaultCacheKeyFn,
      ...dataLoaderOptions,
    });
    loaders.set(cacheKey, loader);
  }

  return loader;
}
