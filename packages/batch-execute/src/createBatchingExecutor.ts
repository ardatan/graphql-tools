import DataLoader from 'dataloader';

import { Executor, ExecutionRequest, ExecutionResult, getDocumentOperationType } from '@graphql-tools/utils';

import { mergeRequests } from './mergeRequests';
import { splitResult } from './splitResult';
import { OperationTypeNode } from 'graphql';

interface BatchedExecutionRequest {
  operationType: OperationTypeNode;
  request: ExecutionRequest;
}

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
    const req: BatchedExecutionRequest = {
      operationType: request.operationType ?? getDocumentOperationType(request.document, request.operationName),
      request,
    };
    return req.operationType === 'subscription' ? executor(req.request) : loader.load(req);
  };
}

function createLoadFn(
  executor: Executor,
  extensionsReducer: (mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>
) {
  return async function batchExecuteLoadFn(
    requests: ReadonlyArray<BatchedExecutionRequest>
  ): Promise<Array<ExecutionResult>> {
    const execBatches: Array<Array<BatchedExecutionRequest>> = [];
    let index = 0;
    const request = requests[index];
    const operationType = request.operationType;

    let currentBatch: Array<BatchedExecutionRequest> = [request];
    execBatches.push(currentBatch);

    while (++index < requests.length) {
      const currentRequest = requests[index];
      const currentOperationType = currentRequest.operationType;

      if (operationType === currentOperationType) {
        currentBatch.push(currentRequest);
      } else {
        currentBatch = [currentRequest];
        execBatches.push(currentBatch);
      }
    }

    const results = await Promise.all(
      execBatches.map(async execBatch => {
        const execRequests = execBatch.map(b => b.request);
        const mergedRequests = mergeRequests(execBatch[0].operationType, execRequests, extensionsReducer);
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
