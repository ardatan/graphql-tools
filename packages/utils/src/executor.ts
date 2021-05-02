import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { AsyncExecutionResult, ExecutionResult } from './Interfaces';

export interface ExecutionParams<TArgs = Record<string, any>, TContext = any> {
  document: DocumentNode;
  variables?: TArgs;
  extensions?: Record<string, any>;
  context?: TContext;
  info?: GraphQLResolveInfo;
}

export type AsyncExecutor<TBaseContext = Record<string, any>> = <
  TReturn = Record<string, any>,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext
>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<AsyncIterableIterator<AsyncExecutionResult<TReturn>> | ExecutionResult<TReturn>>;

export type SyncExecutor<TBaseContext = Record<string, any>> = <
  TReturn = Record<string, any>,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext
>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn>;

export type Executor<TBaseContext = Record<string, any>> = <
  TReturn = Record<string, any>,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext
>(
  params: ExecutionParams<TArgs, TContext>
) => ExecutionResult<TReturn> | AsyncIterableIterator<AsyncExecutionResult<TReturn>> | Promise<AsyncIterableIterator<AsyncExecutionResult<TReturn>> | ExecutionResult<TReturn>>;

export type Subscriber<TBaseContext = Record<string, any>> = <
  TReturn = Record<string, any>,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext
>(
  params: ExecutionParams<TArgs, TContext>
) => Promise<AsyncIterator<ExecutionResult<TReturn>> | ExecutionResult<TReturn>>;
