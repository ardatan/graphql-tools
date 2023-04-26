import DataLoader from 'dataloader';

import { Executor, ExecutionRequest, ExecutionResult, getOperationASTFromRequest } from '@graphql-tools/utils';

import { mergeRequests } from './mergeRequests.js';
import { splitResult } from './splitResult.js';
import { ValueOrPromise } from 'value-or-promise';

export function createBatchingExecutor(
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any>,
  extensionsReducer: (
    mergedExtensions: Record<string, any>,
    request: ExecutionRequest
  ) => Record<string, any> = defaultExtensionsReducer
): Executor {
  const loadFn = createLoadFn(executor, extensionsReducer);
  const loader = new DataLoader(loadFn, dataLoaderOptions);
  return function batchingExecutor(request: ExecutionRequest) {
    const operationAst = getOperationASTFromRequest(request);
    return operationAst.operation === 'subscription' ? executor(request) : loader.load(request);
  };
}

function createLoadFn(
  executor: Executor,
  extensionsReducer: (mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>
) {
  return function batchExecuteLoadFn(
    requests: ReadonlyArray<ExecutionRequest>
  ): ValueOrPromise<Array<ExecutionResult>> {
    if (requests.length === 1) {
      return new ValueOrPromise(() => executor(requests[0]) as any)
        .then((result: ExecutionResult) => [result])
        .catch((err: any) => [err]);
    }
    const execBatches: Array<Array<ExecutionRequest>> = [];
    let index = 0;
    const request = requests[index];
    let currentBatch: Array<ExecutionRequest> = [request];
    execBatches.push(currentBatch);

    const operationAst = getOperationASTFromRequest(request);
    const operationType = operationAst.operation;

    if (operationType == null) {
      throw new Error('could not identify operation type of document');
    }

    while (++index < requests.length) {
      const currentRequest = requests[index];
      const currentOperationAST = getOperationASTFromRequest(currentRequest);
      const currentOperationType = currentOperationAST.operation;

      if (operationType === currentOperationType) {
        currentBatch.push(currentRequest);
      } else {
        currentBatch = [currentRequest];
        execBatches.push(currentBatch);
      }
    }

    return ValueOrPromise.all(
      execBatches.map(execBatch =>
        new ValueOrPromise(() => {
          const mergedRequests = mergeRequests(execBatch, extensionsReducer);
          return executor(mergedRequests) as ExecutionResult;
        }).then(resultBatches => splitResult(resultBatches, execBatch.length))
      )
    ).then(results => results.flat());
  };
}

function defaultExtensionsReducer(
  mergedExtensions: Record<string, any>,
  request: ExecutionRequest
): Record<string, any> {
  const newExtensions = request.extensions;
  if (newExtensions != null) {
    Object.assign(mergedExtensions, newExtensions);
  }
  return mergedExtensions;
}
