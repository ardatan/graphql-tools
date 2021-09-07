import DataLoader from 'dataloader';

import { ExecutionRequest, Executor, ExecutionResult } from '@graphql-tools/utils';

import { mergeRequests } from './mergeRequests';
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
    return request.operationType === 'subscription' ? executor(request) : loader.load(request);
  };
}

type ExtensionsReducer = (mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>;

async function executeBatch(
  executor: Executor,
  extensionsReducer: ExtensionsReducer,
  execBatch: ExecutionRequest[],
  results: ExecutionResult[],
  execBatchIndex: number
) {
  const mergedRequest = mergeRequests(execBatch, extensionsReducer);
  const resultBatches = (await executor(mergedRequest)) as ExecutionResult;
  splitResult(resultBatches, results, execBatchIndex);
}

function createLoadFn(executor: Executor, extensionsReducer: ExtensionsReducer) {
  return async function batchExecuteLoadFn(requests: ReadonlyArray<ExecutionRequest>): Promise<Array<ExecutionResult>> {
    const execBatches: Array<Array<ExecutionRequest>> = [];
    let index = 0;
    const request = requests[index];
    let currentBatch: Array<ExecutionRequest> = [request];
    execBatches.push(currentBatch);

    const operationType = request.operationType;

    const jobs: Promise<void>[] = [];
    const results: ExecutionResult[] = [];

    while (++index < requests.length) {
      const currentOperationType = requests[index].operationType;
      if (operationType == null) {
        throw new Error('Could not identify operation type of document.');
      }

      if (operationType === currentOperationType) {
        currentBatch.push(requests[index]);
      } else {
        const batchExecutionJob = executeBatch(
          executor,
          extensionsReducer,
          currentBatch,
          results,
          execBatches.length - 1
        );
        jobs.push(batchExecutionJob);
        currentBatch = [requests[index]];
        execBatches.push(currentBatch);
      }
    }

    const batchExecutionJob = executeBatch(executor, extensionsReducer, currentBatch, results, execBatches.length - 1);
    jobs.push(batchExecutionJob);

    await Promise.all(jobs);

    return results;
  };
}

function defaultExtensionsReducer(
  mergedExtensions: Record<string, any>,
  request: ExecutionRequest
): Record<string, any> {
  const newExtensions = request.extensions;
  if (newExtensions != null) {
    for (const extensionName in newExtensions) {
      const newExtension = newExtensions[extensionName];
      if (newExtension) {
        mergedExtensions[extensionName] = newExtension;
      }
    }
  }
  return mergedExtensions;
}
