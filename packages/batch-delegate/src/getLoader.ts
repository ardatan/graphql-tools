import {
  getNamedType,
  GraphQLList,
  GraphQLSchema,
  SelectionNode,
  FieldNode,
  Kind,
  print,
  SelectionSetNode,
} from 'graphql';

import DataLoader from 'dataloader';

import { delegateToSchema, SubschemaConfig } from '@graphql-tools/delegate';
import { memoize1, memoize2, relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

function mergeSelectionSets(...selectionSets: Array<SelectionSetNode>): SelectionSetNode {
  const normalizedSelections: Record<string, SelectionNode> = Object.create(null);

  for (const selectionSet of selectionSets) {
    for (const selection of selectionSet.selections) {
      const normalizedSelection = print(selection);
      normalizedSelections[normalizedSelection] = selection;
    }
  }

  const newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: Object.values(normalizedSelections),
  };

  return newSelectionSet;
}

interface KeyAndSelectionSet<K> {
  key: K;
  selectionSet?: SelectionSetNode;
}

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const fieldName = options.fieldName ?? options.info.fieldName;
  const { valuesFromResults, lazyOptionsFn } = options;
  const returnType = new GraphQLList(getNamedType(options.returnType ?? options.info.returnType));

  return async function batchFn(keysAndSelectionSets: ReadonlyArray<KeyAndSelectionSet<K>>) {
    const keys: K[] = [];
    const selectionSets: SelectionSetNode[] = [];
    for (const { key, selectionSet } of keysAndSelectionSets) {
      keys.push(key);
      if (selectionSet) {
        selectionSets.push(selectionSet);
      }
    }
    const results = await delegateToSchema({
      returnType,
      onLocatedError: originalError => {
        console.error(originalError);
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
      selectionSet: options.selectionSet ? mergeSelectionSets(...selectionSets) : undefined,
    });

    if (results instanceof Error) {
      return keys.map(() => results);
    }

    const values = valuesFromResults == null ? results : valuesFromResults(results, keys);

    return Array.isArray(values) ? values : keys.map(() => values);
  };
}

function defaultCacheKeyFn({ key, selectionSet }: KeyAndSelectionSet<any>) {
  let cacheKey = JSON.stringify(key);
  if (selectionSet) {
    cacheKey += print(selectionSet);
  }
  return cacheKey;
}

const getLoadersWithSelectionSetMap = memoize2(function getLoadersWithSelectionSetMap<K, V, C>(
  _schema: GraphQLSchema | SubschemaConfig,
  _context: any
) {
  return new Map<string, DataLoader<KeyAndSelectionSet<K>, V, C>>();
});

const getLoadersWithoutSelectionSetMap = memoize1(function getLoadersWithoutSelectionSetMap<K, V, C>(
  _fieldNodes: ReadonlyArray<FieldNode>
) {
  return new Map<string, DataLoader<KeyAndSelectionSet<K>, V, C>>();
});

const EMPTY_CONTEXT = {};

export function getLoader<K = any, V = any, C = K>(
  options: BatchDelegateOptions<any>
): DataLoader<KeyAndSelectionSet<K>, V, C> {
  const loaders = options.selectionSet
    ? getLoadersWithSelectionSetMap<K, V, C>(options.schema, options.context || EMPTY_CONTEXT)
    : getLoadersWithoutSelectionSetMap<K, V, C>(options.info.fieldNodes);

  let loaderKey = '';
  const fieldName = options.fieldName ?? options.info.fieldName;
  loaderKey += fieldName;
  const namedReturnType = getNamedType(options.returnType ?? options.info.returnType);
  loaderKey += namedReturnType.name;
  let loader = loaders.get(loaderKey);

  // Prevents the keys to be passed with the same structure
  const dataLoaderOptions: DataLoader.Options<any, any, any> = {
    cacheKeyFn: defaultCacheKeyFn,
    ...options.dataLoaderOptions,
  };

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<KeyAndSelectionSet<K>, V, C>(batchFn, dataLoaderOptions);
    loaders.set(loaderKey, loader);
  }

  return loader;
}
