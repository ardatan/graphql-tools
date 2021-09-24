import DataLoader from 'dataloader';

import { ExecutionRequest, Executor, ExecutionResult } from '@graphql-tools/utils';

import { mergeRequests } from './mergeRequests';
import { splitResult } from './splitResult';
import { Kind } from 'graphql';

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

    const operationType = request.operationType ?? getOperationType(request);

    while (++index < requests.length) {
      const currentOperationType = requests[index].operationType ?? getOperationType(requests[index]);
      if (operationType == null) {
        throw new Error('Could not identify operation type of document.');
      }

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

function getOperationType(request: ExecutionRequest): string {
  return request.document.definitions.find(def => def.kind === Kind.OPERATION_DEFINITION).operation;
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
