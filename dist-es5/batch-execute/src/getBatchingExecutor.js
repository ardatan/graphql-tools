import { memoize2of4 } from '@graphql-tools/utils';
import { createBatchingExecutor } from './createBatchingExecutor';
export var getBatchingExecutor = memoize2of4(function getBatchingExecutor(_context, executor, dataLoaderOptions, extensionsReducer) {
    return createBatchingExecutor(executor, dataLoaderOptions, extensionsReducer);
});
