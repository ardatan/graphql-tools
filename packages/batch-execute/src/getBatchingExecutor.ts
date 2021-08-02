import DataLoader from 'dataloader';

import nanomemoize from 'nano-memoize';

import { ExecutionRequest, Executor } from '@graphql-tools/utils';

import { createBatchingExecutor } from './createBatchingExecutor';

export const getBatchingExecutor = nanomemoize(
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
  { maxArgs: 2 }
);
