import { GraphQLSchema, FieldNode } from 'graphql';

import DataLoader from 'dataloader';

import {
  SubschemaConfig,
  Transformer,
  DelegationContext,
  validateRequest,
  getExecutor,
  getDelegatingOperation,
  createRequestFromInfo,
  getDelegationContext,
} from '@graphql-tools/delegate';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

const cache1: WeakMap<
  ReadonlyArray<FieldNode>,
  WeakMap<GraphQLSchema | SubschemaConfig, Record<string, DataLoader<any, any>>>
> = new WeakMap();

function createBatchFn<K = any>(
  options: BatchDelegateOptions
): (
  keys: ReadonlyArray<K>,
  request: ExecutionRequest,
  delegationContext: DelegationContext<any>
) => Promise<Array<ExecutionResult<Record<string, any>>>> {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));

  const { validateRequest: shouldValidateRequest } = options;

  return async (keys: ReadonlyArray<K>, request: ExecutionRequest, delegationContext: DelegationContext<any>) => {
    const { fieldName, context, info } = delegationContext;

    const transformer = new Transformer({
      ...delegationContext,
      args: argsFromKeys(keys),
    });

    const processedRequest = transformer.transformRequest(request);

    if (shouldValidateRequest) {
      validateRequest(delegationContext, processedRequest.document);
    }

    const executor = getExecutor(delegationContext);

    const batchResult = (await executor({
      ...processedRequest,
      context,
      info,
    })) as ExecutionResult;

    return splitResult(transformer.transformResult(batchResult), fieldName, keys.length);
  };
}

export function getLoader<K = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, ExecutionResult, C> {
  const {
    info,
    operationName,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
    returnType = info.returnType,
    selectionSet,
    fieldNodes,
  } = options;

  if (operation !== 'query' && operation !== 'mutation') {
    throw new Error(`Batch delegation not possible for operation '${operation}'.`);
  }

  const request = createRequestFromInfo({
    info,
    operation,
    fieldName,
    selectionSet,
    fieldNodes,
    operationName,
  });

  const delegationContext = getDelegationContext({
    request,
    ...options,
    operation,
    fieldName,
    returnType,
  });

  let cache2 = cache1.get(options.info.fieldNodes);

  if (cache2 === undefined) {
    cache2 = new WeakMap();
    cache1.set(options.info.fieldNodes, cache2);
    const loaders = Object.create(null);
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, ExecutionResult, C>(
      keys => batchFn(keys, request, delegationContext),
      options.dataLoaderOptions
    );
    loaders[fieldName] = loader;
    return loader;
  }

  const loaders = cache2.get(options.schema);

  if (loaders === undefined) {
    const newLoaders = Object.create(null);
    cache2.set(options.schema, newLoaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, ExecutionResult, C>(
      keys => batchFn(keys, request, delegationContext),
      options.dataLoaderOptions
    );
    newLoaders[fieldName] = loader;
    return loader;
  }

  let loader = loaders[fieldName];

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, ExecutionResult, C>(
      keys => batchFn(keys, request, delegationContext),
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
