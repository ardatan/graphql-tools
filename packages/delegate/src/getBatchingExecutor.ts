import { getOperationAST } from 'graphql';

import isPromise from 'is-promise';

import DataLoader from 'dataloader';

import { ExecutionResult, Request } from '@graphql-tools/utils';

import { SubschemaConfig, ExecutionParams } from './types';
import { memoize2of3 } from './memoize';
import { mergeRequests } from './mergeRequests';
import { splitResult } from './splitResult';

export const getBatchingExecutor = memoize2of3(function (
  _context: Record<string, any>,
  _subschemaConfig: SubschemaConfig,
  executor: ({ document, context, variables, info }: ExecutionParams) => ExecutionResult | Promise<ExecutionResult>
) {
  const loader = new DataLoader(createLoadFn(executor));
  return (request: Request) => loader.load(request);
});

function createLoadFn(
  executor: ({ document, context, variables, info }: ExecutionParams) => ExecutionResult | Promise<ExecutionResult>
) {
  return async (requests: Array<Request>): Promise<Array<ExecutionResult>> => {
    const requestBatches: Array<Array<Request>> = [];
    let index = 0;
    const request = requests[index];
    let currentBatch: Array<Request> = [request];
    requestBatches.push(currentBatch);
    const operationType = getOperationAST(request.document).operation;
    while (++index < requests.length) {
      const currentOperationType = getOperationAST(requests[index].document).operation;
      if (operationType === currentOperationType) {
        currentBatch.push(requests[index]);
      } else {
        currentBatch = [requests[index]];
        requestBatches.push(currentBatch);
      }
    }

    let containsPromises = false;
    const executionResults: Array<ExecutionResult | Promise<ExecutionResult>> = [];
    requestBatches.forEach(requestBatch => {
      const mergedRequest = mergeRequests(requestBatch);
      const executionResult = executor(mergedRequest);

      if (isPromise(executionResult)) {
        containsPromises = true;
      }
      executionResults.push(executionResult);
    });

    if (containsPromises) {
      return Promise.all(executionResults).then(resultBatches => {
        let results: Array<ExecutionResult> = [];
        resultBatches.forEach((resultBatch, index) => {
          results = results.concat(splitResult(resultBatch, requestBatches[index].length));
        });
        return results;
      });
    }

    let results: Array<ExecutionResult> = [];
    (executionResults as Array<ExecutionResult>).forEach((resultBatch, index) => {
      results = results.concat(splitResult(resultBatch, requestBatches[index].length));
    });
    return results;
  };
}
