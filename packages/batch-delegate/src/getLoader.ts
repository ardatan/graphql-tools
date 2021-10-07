import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema, SelectionNode, print } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { memoize3, relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

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
  _context: any,
  _returnType: GraphQLOutputType,
  _schema: GraphQLSchema | SubschemaConfig<any, any, any, any>
) {
  return new Map<string, DataLoader<K, V, C>>();
});

const EMPTY_CONTEXT = {};

const loaderMapOptionsMap = new WeakMap<DataLoader<any, any, any>, BatchDelegateOptions<any, any, any, any>>();

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C> {
  const loaders = getLoadersMap<K, V, C>(
    options.context || EMPTY_CONTEXT,
    getNamedType(options.info.returnType as any) as any,
    options.schema
  );

  const selectionSetSuffix = options.selectionSet
    ? 'withSelectionSet'
    : options.info.fieldNodes.reduce((str, fieldNode) => str + '\n' + print(fieldNode), '');
  const fieldName = options.fieldName ?? options.info.fieldName;
  const loaderKey = fieldName + selectionSetSuffix;
  let loader = loaders.get(loaderKey);

  // Prevents the keys to be passed with the same structure
  const dataLoaderOptions: DataLoader.Options<any, any, any> = {
    cacheKeyFn: defaultCacheKeyFn,
    ...options.dataLoaderOptions,
  };

  if (loader === undefined) {
    const batchFnOptions = {
      ...options,
      selectionSet: options.selectionSet && {
        ...options.selectionSet,
        selections: [],
      },
    };
    const batchFn = createBatchFn(batchFnOptions);
    loader = new DataLoader<K, V, C>(batchFn, dataLoaderOptions);
    loaders.set(loaderKey, loader);
    loaderMapOptionsMap.set(loader, batchFnOptions);
  }

  if (options.selectionSet) {
    const batchFnOptions = loaderMapOptionsMap.get(loader)!;
    const existingSelections = batchFnOptions.selectionSet!.selections as SelectionNode[];
    existingSelections.push(...options.selectionSet.selections);
  }

  return loader;
}
