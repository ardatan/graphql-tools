import { ExecutionResult, Request } from './Interfaces';

type MaybePromise<T> = Promise<T> | T;
type MaybeAsyncIterableIterator<T> = AsyncIterableIterator<T> | T;

export type AsyncExecutor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions
>(
  request: Request<TArgs, TContext, TRoot, TExtensions>
) => Promise<MaybeAsyncIterableIterator<ExecutionResult<TReturn>>>;

export type SyncExecutor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions
>(
  request: Request<TArgs, TContext, TRoot, TExtensions>
) => ExecutionResult<TReturn>;

export type Executor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions
>(
  request: Request<TArgs, TContext, TRoot, TExtensions>
) => MaybePromise<MaybeAsyncIterableIterator<ExecutionResult<TReturn>>>;
