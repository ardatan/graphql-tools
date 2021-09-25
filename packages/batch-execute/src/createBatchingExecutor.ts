import DataLoader from 'dataloader';

import { ExecutionRequest, Executor, ExecutionResult } from '@graphql-tools/utils';

import { mergeRequests, isOperationDefinition } from './mergeRequests';
import { splitResult } from './splitResult';

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
    if (request.operationType == null) {
      for (const def of request.document.definitions) {
        if (isOperationDefinition(def)) {
          request.operationType = def.operation;
        }
      }
    }
    return request.operationType === 'subscription' ? executor(request) : loader.load(request);
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

    const operationType = request.operationType;

    if (operationType == null) {
      throw new Error('Could not identify operation type of document.');
    }

    while (++index < requests.length) {
      const currentOperationType = requests[index].operationType;

      if (operationType === currentOperationType) {
        currentBatch.push(requests[index]);
      } else {
        currentBatch = [requests[index]];
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
