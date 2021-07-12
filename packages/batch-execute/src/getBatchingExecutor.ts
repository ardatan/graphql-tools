import DataLoader from 'dataloader';

import { Request, Executor } from '@graphql-tools/utils';
import { createBatchingExecutor } from './createBatchingExecutor';
import { memoize2of4 } from './memoize';

export const getBatchingExecutor = memoize2of4(function (
  _context: Record<string, any>,
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any> | undefined,
  extensionsReducer?: undefined | ((mergedExtensions: Record<string, any>, request: Request) => Record<string, any>)
): Executor {
  return createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer);
});
