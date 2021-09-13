import DataLoader from 'dataloader';
import { ExecutionRequest, Executor } from '@graphql-tools/utils';
export declare function createBatchingExecutor(
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any>,
  extensionsReducer?: (mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>
): Executor;
