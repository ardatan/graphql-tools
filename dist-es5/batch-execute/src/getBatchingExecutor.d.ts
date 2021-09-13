import DataLoader from 'dataloader';
import { ExecutionRequest, Executor } from '@graphql-tools/utils';
export declare const getBatchingExecutor: (
  _context: Record<string, any>,
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any> | undefined,
  extensionsReducer?:
    | ((mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>)
    | undefined
) => Executor;
