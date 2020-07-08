import { IDelegateToSchemaOptions } from '@graphql-tools/delegate';

export type BatchDelegateFn<TContext = Record<string, any>, K = any> = (
  batchDelegateOptions: BatchDelegateOptions<TContext, K>
) => any;

export type BatchDelegateOptionsFn<TContext = Record<string, any>, K = any> = (
  batchDelegateOptions: BatchDelegateOptions<TContext, K>
) => IDelegateToSchemaOptions<TContext>;

export interface BatchDelegateOptions<TContext = Record<string, any>, K = any>
  extends Omit<IDelegateToSchemaOptions<TContext>, 'args'> {
  key: K;
}
