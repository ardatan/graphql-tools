import DataLoader from 'dataloader';

import { ExecutionRequest, Executor, memoize2of4 } from '@graphql-tools/utils';
import { createBatchingExecutor } from './createBatchingExecutor.js';

export const getBatchingExecutor = memoize2of4(function getBatchingExecutor(
  _context: Record<string, any>,
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any> | undefined,
  extensionsReducer?:
    | undefined
    | ((mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>)
): Executor {
  return createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer);
});
