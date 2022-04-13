import { ExecutionResult, ExecutionRequest } from './Interfaces';

type MaybePromise<T> = Promise<T> | T;
type MaybeAsyncIterable<T> = AsyncIterable<T> | T;

export type AsyncExecutor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs extends Record<string, any> = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions
>(
  request: ExecutionRequest<TArgs, TContext, TRoot, TExtensions>
) => Promise<MaybeAsyncIterable<ExecutionResult<TReturn>>>;

export type SyncExecutor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs extends Record<string, any> = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions
>(
  request: ExecutionRequest<TArgs, TContext, TRoot, TExtensions>
) => ExecutionResult<TReturn>;

export type Executor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs extends Record<string, any> = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions
>(
  request: ExecutionRequest<TArgs, TContext, TRoot, TExtensions>
) => MaybePromise<MaybeAsyncIterable<ExecutionResult<TReturn>>>;
