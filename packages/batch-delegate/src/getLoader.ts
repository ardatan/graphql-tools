import { GraphQLSchema, FieldNode } from 'graphql';

import DataLoader from 'dataloader';

import { SubschemaConfig, Transformer, getExecutor, validateRequest, DelegationContext } from '@graphql-tools/delegate';
import {
  AsyncExecutionResult,
  ExecutionPatchResult,
  ExecutionResult,
  isAsyncIterable,
  mapAsyncIterator,
  Request,
  splitAsyncIterator,
} from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

const cache1: WeakMap<
  ReadonlyArray<FieldNode>,
  WeakMap<GraphQLSchema | SubschemaConfig, Record<string, DataLoader<any, any>>>
> = new WeakMap();

function createBatchFn<K = any>(options: BatchDelegateOptions, request: Request, delegationContext: DelegationContext) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));

  const { binding, skipValidation } = options;

  const { fieldName, context, info } = delegationContext;

  return async (keys: ReadonlyArray<K>) => {
    const transformer = new Transformer(
      {
        ...delegationContext,
        args: argsFromKeys(keys),
      },
      binding
    );

    const processedRequest = transformer.transformRequest(request);

    if (!skipValidation) {
      validateRequest(delegationContext, processedRequest.document);
    }

    const executor = getExecutor(delegationContext);

    const batchResult = await executor({
      ...processedRequest,
      context,
      info,
    });

    const numKeys = keys.length;
    if (isAsyncIterable(batchResult)) {
      const mappedBatchResult = mapAsyncIterator(batchResult, result => transformer.transformResult(result));
      return splitAsyncIterator(mappedBatchResult, numKeys, result => splitAsyncResult(result, fieldName));
    }

    return splitResult(transformer.transformResult(batchResult), fieldName, numKeys);
  };
}

export function getLoader<K = any, C = K>(
  options: BatchDelegateOptions,
  request: Request,
  delegationContext: DelegationContext
): DataLoader<K, ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>, C> {
  const fieldName = options.fieldName ?? options.info.fieldName;

  let cache2: WeakMap<
    GraphQLSchema | SubschemaConfig,
    Record<string, DataLoader<K, ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>, C>>
  > = cache1.get(options.info.fieldNodes);

  if (cache2 === undefined) {
    cache2 = new WeakMap();
    cache1.set(options.info.fieldNodes, cache2);
    const loaders = Object.create(null);
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options, request, delegationContext);
    const loader = new DataLoader<K, ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>, C>(
      keys => batchFn(keys),
      options.dataLoaderOptions
    );
    loaders[fieldName] = loader;
    return loader;
  }

  let loaders = cache2.get(options.schema);

  if (loaders === undefined) {
    loaders = Object.create(null);
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options, request, delegationContext);
    const loader = new DataLoader<K, ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>, C>(
      keys => batchFn(keys),
      options.dataLoaderOptions
    );
    loaders[fieldName] = loader;
    return loader;
  }

  let loader = loaders[fieldName];

  if (loader === undefined) {
    const batchFn = createBatchFn(options, request, delegationContext);
    loader = new DataLoader<K, ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>, C>(
      keys => batchFn(keys),
      options.dataLoaderOptions
    );
    loaders[fieldName] = loader;
  }

  return loader;
}

function splitResult(result: ExecutionResult, fieldName: string, numItems: number): Array<ExecutionResult> {
  const { data, errors } = result;
  const fieldData = data?.[fieldName];

  if (fieldData === undefined) {
    if (errors === undefined) {
      return Array(numItems).fill({});
    }

    return Array(numItems).fill({ errors });
  }

  return fieldData.map((value: any) => ({
    data: {
      [fieldName]: value,
    },
    errors,
  }));
}

function splitAsyncResult(result: AsyncExecutionResult, fieldName: string): [[number, AsyncExecutionResult]] {
  const { data, errors, path } = result as ExecutionPatchResult;

  if (path === undefined || path.length === 0) {
    const fieldData = data?.[fieldName];
    if (fieldData !== undefined) {
      return fieldData.map((value: any, index: number) => [
        index,
        {
          data: {
            [fieldName]: value,
          },
          errors,
        },
      ]);
    }
  } else if (path[0] === fieldName) {
    const index = path[1] as number;

    if (path.length === 2) {
      return [
        [
          index,
          {
            ...result,
            data: {
              [fieldName]: data,
            },
            errors,
          },
        ],
      ];
    }

    const newPath = [fieldName, ...path.slice(2)];
    return [
      [
        index,
        {
          ...result,
          data,
          errors,
          path: newPath,
        },
      ],
    ];
  }

  return [[undefined, result]];
}
