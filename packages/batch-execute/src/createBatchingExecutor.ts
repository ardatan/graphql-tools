import DataLoader from 'dataloader';

import { ValueOrPromise } from 'value-or-promise';

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
  const loader = new DataLoader(createLoadFn(executor, extensionsReducer), dataLoaderOptions);
  return (request: ExecutionRequest) => {
    return request.operationType === 'subscription' ? executor(request) : loader.load(request);
  };
}

function createLoadFn(
  executor: Executor,
  extensionsReducer: (mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>
) {
  return async (requests: ReadonlyArray<ExecutionRequest>): Promise<Array<ExecutionResult>> => {
    const execBatches: Array<Array<ExecutionRequest>> = [];
    let index = 0;
    const request = requests[index];
    let currentBatch: Array<ExecutionRequest> = [request];
    execBatches.push(currentBatch);

    const operationType = request.operationType;

    while (++index < requests.length) {
      const currentOperationType = requests[index].operationType;
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

    const executionResults: Array<ValueOrPromise<ExecutionResult>> = execBatches.map(execBatch => {
      const mergedRequests = mergeRequests(execBatch, extensionsReducer);
      return new ValueOrPromise(() => executor(mergedRequests) as ExecutionResult);
    });

    return ValueOrPromise.all(executionResults)
      .then(resultBatches =>
        resultBatches.reduce(
          (results, resultBatch, index) => results.concat(splitResult(resultBatch, execBatches[index].length)),
          new Array<ExecutionResult<Record<string, any>>>()
        )
      )
      .resolve();
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
