import DataLoader from 'dataloader';

import { Executor, ExecutionRequest, ExecutionResult, getOperationASTFromRequest } from '@graphql-tools/utils';

import { mergeRequests } from './mergeRequests.js';
import { splitResult } from './splitResult.js';

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
  return async function batchExecuteLoadFn(requests: ReadonlyArray<ExecutionRequest>): Promise<Array<ExecutionResult>> {
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

    const results = await Promise.all(
      execBatches.map(async execBatch => {
        const mergedRequests = mergeRequests(execBatch, extensionsReducer);
        const resultBatches = (await executor(mergedRequests)) as ExecutionResult;
        return splitResult(resultBatches, execBatch.length);
      })
    );

    return results.flat();
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
