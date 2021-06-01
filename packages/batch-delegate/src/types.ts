import DataLoader from 'dataloader';

import { IDelegateToSchemaOptions } from '@graphql-tools/delegate';

export type BatchDelegateFn<TContext = Record<string, any>, K = any> = (
  batchDelegateOptions: BatchDelegateOptions<TContext, K>
) => any;

export type BatchDelegateOptionsFn<TContext = Record<string, any>, K = any> = (
  batchDelegateOptions: BatchDelegateOptions<TContext, K>
) => IDelegateToSchemaOptions<TContext>;

export interface BatchDelegateOptions<TContext = Record<string, any>, K = any, V = any, C = K>
  extends Omit<IDelegateToSchemaOptions<TContext>, 'args'> {
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  key: K;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
}
