import { GraphQLSchema, FieldNode } from 'graphql';

import DataLoader from 'dataloader';

import {
  SubschemaConfig,
  Transformer,
  validateRequest,
  getExecutor,
  getDelegatingOperation,
  createRequestFromInfo,
  getDelegationContext,
} from '@graphql-tools/delegate';
import { ExecutionResult, memoize2 } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

function createBatchFn<K = any>(
  options: BatchDelegateOptions
): (keys: ReadonlyArray<K>) => Promise<Array<ExecutionResult<Record<string, any>>>> {
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

  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));

  const { validateRequest: shouldValidateRequest } = options;

  return async function batchFn(keys: ReadonlyArray<K>) {
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

function defaultCacheKeyFn(key: any) {
  if (typeof key === 'object') {
    return JSON.stringify(key);
  }
  return key;
}

const getLoadersMap = memoize2(function getLoadersMap<K, V, C>(
  _fieldNodes: readonly FieldNode[],
  _schema: GraphQLSchema | SubschemaConfig<any, any, any, any>
) {
  return new Map<string, DataLoader<K, V, C>>();
});

export function getLoader<K = any, C = K>(options: BatchDelegateOptions<any>): DataLoader<K, ExecutionResult, C> {
  const {
    info,
    operation = getDelegatingOperation(info.parentType, info.schema),
    fieldName = info.fieldName,
  } = options;

  if (operation !== 'query' && operation !== 'mutation') {
    throw new Error(`Batch delegation not possible for operation '${operation}'.`);
  }

  // Prevents the keys to be passed with the same structure
  const dataLoaderOptions: DataLoader.Options<K, ExecutionResult, C> = {
    cacheKeyFn: defaultCacheKeyFn,
    ...options.dataLoaderOptions,
  };

  const loaders = getLoadersMap<K, ExecutionResult, C>(info.fieldNodes, options.schema);
  let loader = loaders.get(fieldName);

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, ExecutionResult, C>(keys => batchFn(keys), dataLoaderOptions);
    loaders.set(fieldName, loader);
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
