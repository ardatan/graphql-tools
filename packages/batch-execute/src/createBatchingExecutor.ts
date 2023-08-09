import DataLoader from 'dataloader';
import { ValueOrPromise } from 'value-or-promise';
import {
  ExecutionRequest,
  ExecutionResult,
  Executor,
  getOperationASTFromRequest,
  isAsyncIterable,
} from '@graphql-tools/utils';
import { mergeRequests } from './mergeRequests.js';
import { splitResult } from './splitResult.js';

export function createBatchingExecutor(
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any>,
  extensionsReducer: (
    mergedExtensions: Record<string, any>,
    request: ExecutionRequest,
  ) => Record<string, any> = defaultExtensionsReducer,
): Executor {
  const loadFn = createLoadFn(executor, extensionsReducer);
  const queryLoader = new DataLoader(loadFn, dataLoaderOptions);
  const mutationLoader = new DataLoader(loadFn, dataLoaderOptions);
  return function batchingExecutor(request: ExecutionRequest) {
    const operationType = request.operationType ?? getOperationASTFromRequest(request)?.operation;
    switch (operationType) {
      case 'query':
        return queryLoader.load(request);
      case 'mutation':
        return mutationLoader.load(request);
      case 'subscription':
        return executor(request);
      default:
        throw new Error(`Invalid operation type "${operationType}"`);
    }
  };
}

function createLoadFn(
  executor: Executor,
  extensionsReducer: (
    mergedExtensions: Record<string, any>,
    request: ExecutionRequest,
  ) => Record<string, any>,
) {
  return function batchExecuteLoadFn(
    requests: ReadonlyArray<ExecutionRequest>,
  ): ValueOrPromise<Array<ExecutionResult>> {
    if (requests.length === 1) {
      return new ValueOrPromise(() => executor(requests[0]) as any)
        .then((result: ExecutionResult) => [result])
        .catch((err: any) => [err]);
    }
    const mergedRequests = mergeRequests(requests, extensionsReducer);
    return new ValueOrPromise(() => executor(mergedRequests)).then(resultBatches => {
      if (isAsyncIterable(resultBatches)) {
        throw new Error('Executor must not return incremental results for batching');
      }
      return splitResult(resultBatches, requests.length);
    });
  };
}

function defaultExtensionsReducer(
  mergedExtensions: Record<string, any>,
  request: ExecutionRequest,
): Record<string, any> {
  const newExtensions = request.extensions;
  if (newExtensions != null) {
    Object.assign(mergedExtensions, newExtensions);
  }
  return mergedExtensions;
}
