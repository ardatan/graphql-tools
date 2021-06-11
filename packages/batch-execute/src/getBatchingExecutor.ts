import DataLoader from 'dataloader';

import { ExecutionParams, Executor } from '@graphql-tools/utils';
import { createBatchingExecutor } from './createBatchingExecutor';
import { memoize2of5 } from './memoize';
import { GraphQLSchema } from 'graphql';

export const getBatchingExecutor = memoize2of5(function (
  _context: Record<string, any> = self ?? window ?? global,
  executor: Executor,
  targetSchema: GraphQLSchema,
  dataLoaderOptions?: DataLoader.Options<any, any, any>,
  extensionsReducer?: (mergedExtensions: Record<string, any>, executionParams: ExecutionParams) => Record<string, any>
): Executor {
  return createBatchingExecutor(executor, targetSchema, dataLoaderOptions, extensionsReducer);
});
