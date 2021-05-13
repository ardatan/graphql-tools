import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { ExecutionResult } from './Interfaces';

export interface ExecutionParams<TArgs = Record<string, any>, TContext = any> {
  document: DocumentNode;
  variables?: TArgs;
  extensions?: Record<string, any>;
  context?: TContext;
  info?: GraphQLResolveInfo;
}

export type AsyncExecutor<TContext = Record<string, any>> = <
  TReturn = Record<string, any>,
  TArgs = Record<string, any>
>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<ExecutionResult<TReturn>>;
export type SyncExecutor<TContext = Record<string, any>> = <TReturn = Record<string, any>, TArgs = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn>;
export type Executor<TContext = Record<string, any>> = <TReturn = Record<string, any>, TArgs = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn> | Promise<ExecutionResult<TReturn>>;
export type Subscriber<TContext = Record<string, any>> = <TReturn = Record<string, any>, TArgs = Record<string, any>>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<AsyncIterator<ExecutionResult<TReturn>> | ExecutionResult<TReturn>>;
