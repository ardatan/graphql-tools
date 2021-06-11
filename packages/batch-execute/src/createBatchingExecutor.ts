import { getOperationAST, GraphQLSchema } from 'graphql';

import DataLoader from 'dataloader';

import { ValueOrPromise } from 'value-or-promise';

import { AsyncExecutionResult, ExecutionParams, Executor, ExecutionResult } from '@graphql-tools/utils';

import { mergeExecutionParams } from './mergeExecutionParams';
import { splitResult } from './splitResult';

export function createBatchingExecutor(
  executor: Executor,
  targetSchema: GraphQLSchema,
  dataLoaderOptions?: DataLoader.Options<any, any, any>,
  extensionsReducer?: (mergedExtensions: Record<string, any>, executionParams: ExecutionParams) => Record<string, any>
): Executor {
  const loader = new DataLoader(
    createLoadFn(executor, targetSchema, extensionsReducer ?? defaultExtensionsReducer),
    dataLoaderOptions
  );
  return (executionParams: ExecutionParams) => loader.load(executionParams);
}

function createLoadFn(
  executor: ({
    document,
    context,
    variables,
    info,
  }: ExecutionParams) =>
    | ExecutionResult
    | AsyncIterableIterator<AsyncExecutionResult>
    | Promise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>,
  targetSchema: GraphQLSchema,
  extensionsReducer: (mergedExtensions: Record<string, any>, executionParams: ExecutionParams) => Record<string, any>
) {
  return async (
    executionParamSet: Array<ExecutionParams>
  ): Promise<
    Array<
      | ExecutionResult
      | AsyncIterableIterator<AsyncExecutionResult>
      | Promise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>
    >
  > => {
    const batchedExecutionParamSets: Array<Array<ExecutionParams>> = [];
    let index = 0;
    const executionParams = executionParamSet[index];
    let currentBatch: Array<ExecutionParams> = [executionParams];
    batchedExecutionParamSets.push(currentBatch);
    const operationType = getOperationAST(executionParams.document, undefined).operation;
    while (++index < executionParamSet.length) {
      const currentOperationType = getOperationAST(executionParamSet[index].document, undefined).operation;
      if (operationType === currentOperationType) {
        currentBatch.push(executionParamSet[index]);
      } else {
        currentBatch = [executionParamSet[index]];
        batchedExecutionParamSets.push(currentBatch);
      }
    }

    const executionResults: Array<ValueOrPromise<ExecutionResult | AsyncIterableIterator<AsyncExecutionResult>>> = [];
    batchedExecutionParamSets.forEach(batchedExecutionParamSet => {
      const mergedExecutionParams = mergeExecutionParams(batchedExecutionParamSet, targetSchema,  extensionsReducer);
      executionResults.push(new ValueOrPromise(() => executor(mergedExecutionParams)));
    });

    return ValueOrPromise.all(executionResults).then(resultBatches => {
      const results: Array<
        | ExecutionResult
        | AsyncIterableIterator<ExecutionResult>
        | Promise<ExecutionResult | AsyncIterableIterator<ExecutionResult>>
      > = [];
      resultBatches.forEach((resultBatch, index) => {
        results.push(...splitResult(resultBatch, batchedExecutionParamSets[index].length));
      });
      return results;
    }).resolve();
  };
}

function defaultExtensionsReducer(
  mergedExtensions: Record<string, any>,
  executionParams: ExecutionParams
): Record<string, any> {
  const newExtensions = executionParams.extensions;
  if (newExtensions != null) {
    Object.assign(mergedExtensions, newExtensions);
  }
  return mergedExtensions;
}
