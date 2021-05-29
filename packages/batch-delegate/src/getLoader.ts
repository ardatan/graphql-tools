import { getNamedType, GraphQLOutputType, GraphQLList, GraphQLSchema, FieldNode } from 'graphql';

import DataLoader from 'dataloader';

import {
  SubschemaConfig,
  Transformer,
  createRequestFromInfo,
  getDelegationContext,
  getDelegatingOperation,
  getExecutor,
  validateRequest,
  Receiver,
  externalValueFromResult,
} from '@graphql-tools/delegate';
import { isAsyncIterable, relocatedError } from '@graphql-tools/utils';

import { BatchDelegateOptions } from './types';

const cache1: WeakMap<
  ReadonlyArray<FieldNode>,
  WeakMap<GraphQLSchema | SubschemaConfig, Record<string, DataLoader<any, any>>>
> = new WeakMap();

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? ((keys: ReadonlyArray<K>) => ({ ids: keys }));
  const { lazyOptionsFn } = options;

  return async (keys: ReadonlyArray<K>) => {
    const {
      context,
      info,
      operationName,
      operation = getDelegatingOperation(info.parentType, info.schema),
      fieldName = info.fieldName,
      returnType = new GraphQLList(getNamedType(options.info.returnType) as GraphQLOutputType),
      selectionSet,
      fieldNodes,
      binding,
      skipValidation,
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
      args: argsFromKeys(keys),
      onLocatedError: originalError => relocatedError(originalError, originalError.path.slice(1)),
      ...(lazyOptionsFn == null ? options : lazyOptionsFn(options)),
      operation,
      fieldName,
      returnType,
    });

    const transformer = new Transformer(delegationContext, binding);

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

    if (isAsyncIterable(batchResult)) {
      // TODO: split the asyncIterable and make a new receiver from each of them, return the Receiver instead of the
      // initial value, so that the correct info can be used to instantiate the Receiver
      const receiver = new Receiver(batchResult, delegationContext, executionResult =>
        transformer.transformResult(executionResult)
      );

      const batchValue = await receiver.getInitialValue();

      return Array.isArray(batchValue) ? batchValue : keys.map(() => batchValue);
    }

    // TODO: split the batchedResult and return the result instead of the value, so the correct info
    // can be used to instantiate the value
    const batchValue = externalValueFromResult(transformer.transformResult(batchResult), delegationContext);

    return Array.isArray(batchValue) ? batchValue : keys.map(() => batchValue);
  };
}

export function getLoader<K = any, V = any, C = K>(options: BatchDelegateOptions): DataLoader<K, V, C> {
  const fieldName = options.fieldName ?? options.info.fieldName;

  let cache2: WeakMap<GraphQLSchema | SubschemaConfig, Record<string, DataLoader<K, V, C>>> = cache1.get(
    options.info.fieldNodes
  );

  if (cache2 === undefined) {
    cache2 = new WeakMap();
    cache1.set(options.info.fieldNodes, cache2);
    const loaders = Object.create(null);
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
    loaders[fieldName] = loader;
    return loader;
  }

  let loaders = cache2.get(options.schema);

  if (loaders === undefined) {
    loaders = Object.create(null);
    cache2.set(options.schema, loaders);
    const batchFn = createBatchFn(options);
    const loader = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
    loaders[fieldName] = loader;
    return loader;
  }

  let loader = loaders[fieldName];

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(keys => batchFn(keys), options.dataLoaderOptions);
    loaders[fieldName] = loader;
  }

  return loader;
}
