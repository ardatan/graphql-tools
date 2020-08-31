import { getOperationAST } from 'graphql';

import isPromise from 'is-promise';

import DataLoader from 'dataloader';

import { ExecutionResult } from '@graphql-tools/utils';

import { SubschemaConfig, ExecutionParams } from './types';
import { memoize2of3 } from './memoize';
import { mergeExecutionParams } from './mergeExecutionParams';
import { splitResult } from './splitResult';

export const getBatchingExecutor = memoize2of3(function (
  _context: Record<string, any>,
  subschemaConfig: SubschemaConfig,
  executor: ({ document, context, variables, info }: ExecutionParams) => ExecutionResult | Promise<ExecutionResult>
) {
  const loader = new DataLoader(
    createLoadFn(executor ?? subschemaConfig.executor),
    subschemaConfig.batchingOptions?.dataLoaderOptions
  );
  return (executionParams: ExecutionParams) => loader.load(executionParams);
});

function createLoadFn(
  executor: ({ document, context, variables, info }: ExecutionParams) => ExecutionResult | Promise<ExecutionResult>
) {
  return async (execs: Array<ExecutionParams>): Promise<Array<ExecutionResult>> => {
    const execBatches: Array<Array<ExecutionParams>> = [];
    let index = 0;
    const exec = execs[index];
    let currentBatch: Array<ExecutionParams> = [exec];
    execBatches.push(currentBatch);
    const operationType = getOperationAST(exec.document, undefined).operation;
    while (++index < execs.length) {
      const currentOperationType = getOperationAST(execs[index].document, undefined).operation;
      if (operationType === currentOperationType) {
        currentBatch.push(execs[index]);
      } else {
        currentBatch = [execs[index]];
        execBatches.push(currentBatch);
      }
    }

    let containsPromises = false;
    const executionResults: Array<ExecutionResult | Promise<ExecutionResult>> = [];
    execBatches.forEach(execBatch => {
      const mergedExecutionParams = mergeExecutionParams(execBatch);
      const executionResult = executor(mergedExecutionParams);

      if (isPromise(executionResult)) {
        containsPromises = true;
      }
      executionResults.push(executionResult);
    });

    if (containsPromises) {
      return Promise.all(executionResults).then(resultBatches => {
        let results: Array<ExecutionResult> = [];
        resultBatches.forEach((resultBatch, index) => {
          results = results.concat(splitResult(resultBatch, execBatches[index].length));
        });
        return results;
      });
    }

    let results: Array<ExecutionResult> = [];
    (executionResults as Array<ExecutionResult>).forEach((resultBatch, index) => {
      results = results.concat(splitResult(resultBatch, execBatches[index].length));
    });
    return results;
  };
}
