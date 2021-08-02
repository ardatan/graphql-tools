import DataLoader from 'dataloader';

import memoize from 'memoizee/weak';

import { ExecutionRequest, Executor } from '@graphql-tools/utils';

import { createBatchingExecutor } from './createBatchingExecutor';

export const getBatchingExecutor = memoize(
  function getBatchingExecutor(
    _context: Record<string, any>,
    executor: Executor,
    dataLoaderOptions?: DataLoader.Options<any, any, any> | undefined,
    extensionsReducer?:
      | undefined
      | ((mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>)
  ): Executor {
    return createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer);
  },
  { length: 2 }
);
