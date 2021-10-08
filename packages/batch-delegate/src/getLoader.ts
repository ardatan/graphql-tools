import { getNamedType, GraphQLList, GraphQLSchema, SelectionNode, FieldNode, Kind } from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { memoize2, relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const fieldName = options.fieldName ?? options.info.fieldName;
  const { valuesFromResults, lazyOptionsFn } = options;
  const returnType = new GraphQLList(getNamedType(options.returnType ?? options.info.returnType));

  return async function batchFn(keys: ReadonlyArray<K>) {
    const results = await delegateToSchema({
      returnType,
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
  return JSON.stringify(key);
}

const getLoadersMap = memoize2(function getLoadersMap<K, V, C>(
  _schema: GraphQLSchema | SubschemaConfig<any, any, any, any>,
  _context: any
) {
  return new Map<string, DataLoader<K, V, C>>();
});

const EMPTY_CONTEXT = {};

const loaderMapOptionsMap = new WeakMap<DataLoader<any, any, any>, BatchDelegateOptions<any, any, any, any>>();

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, V, C> {
  const loaders = getLoadersMap<K, V, C>(options.schema, options.context || EMPTY_CONTEXT);

  let loaderKey = options.selectionSet ? 'withSelectionSet' : 'withoutSelectionSet';
  loaderKey += options.fieldName ?? options.info.fieldName;
  const namedReturnType = getNamedType(options.returnType ?? options.info.returnType!)!;
  loaderKey += namedReturnType.name;
  let loader = loaders.get(loaderKey);

  // Prevents the keys to be passed with the same structure
  const dataLoaderOptions: DataLoader.Options<any, any, any> = {
    cacheKeyFn: defaultCacheKeyFn,
    ...options.dataLoaderOptions,
  };

  if (loader === undefined) {
    const batchFnOptions = {
      ...options,
      ...(options.selectionSet
        ? {
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [...options.selectionSet.selections],
            },
          }
        : {
            info: {
              ...options.info,
              fieldNodes: [...options.info.fieldNodes],
            },
          }),
    };
    const batchFn = createBatchFn(batchFnOptions);
    loader = new DataLoader<K, V, C>(batchFn, dataLoaderOptions);
    loaders.set(loaderKey, loader);
    loaderMapOptionsMap.set(loader, batchFnOptions);
    return loader;
  }

  const batchFnOptions = loaderMapOptionsMap.get(loader)!;
  if (options.selectionSet) {
    const existingSelections = batchFnOptions.selectionSet!.selections as SelectionNode[];
    existingSelections.push(...options.selectionSet.selections);
  } else {
    const fieldNodes = batchFnOptions.info.fieldNodes as FieldNode[];
    fieldNodes.push(...options.info.fieldNodes);
  }

  return loader;
}
