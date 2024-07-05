import { ExecutionRequest, ExecutionResult } from './Interfaces.js';

export type MaybePromise<T> = PromiseLike<T> | T;
export type MaybeAsyncIterable<T> = AsyncIterable<T> | T;

export type AsyncExecutor<
  TBaseContext = Record<string, any>,
  TBaseExtensions = Record<string, any>,
> = <
  TReturn = any,
  TArgs extends Record<string, any> = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions,
>(
  request: ExecutionRequest<TArgs, TContext, TRoot, TExtensions, TReturn>,
) => Promise<MaybeAsyncIterable<ExecutionResult<TReturn>>>;

export type SyncExecutor<
  TBaseContext = Record<string, any>,
  TBaseExtensions = Record<string, any>,
> = <
  TReturn = any,
  TArgs extends Record<string, any> = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions,
>(
  request: ExecutionRequest<TArgs, TContext, TRoot, TExtensions, TReturn>,
) => ExecutionResult<TReturn>;

export type Executor<TBaseContext = Record<string, any>, TBaseExtensions = Record<string, any>> = <
  TReturn = any,
  TArgs extends Record<string, any> = Record<string, any>,
  TContext extends TBaseContext = TBaseContext,
  TRoot = any,
  TExtensions extends TBaseExtensions = TBaseExtensions,
>(
  request: ExecutionRequest<TArgs, TContext, TRoot, TExtensions, TReturn>,
) => MaybePromise<MaybeAsyncIterable<ExecutionResult<TReturn>>>;

export type DisposableSyncExecutor<
  TBaseContext = Record<string, any>,
  TBaseExtensions = Record<string, any>,
> = SyncExecutor<TBaseContext, TBaseExtensions> & { [Symbol.dispose]?: () => void };
export type DisposableAsyncExecutor<
  TBaseContext = Record<string, any>,
  TBaseExtensions = Record<string, any>,
> = AsyncExecutor<TBaseContext, TBaseExtensions> & { [Symbol.dispose]?: () => void };
export type DisposableExecutor<
  TBaseContext = Record<string, any>,
  TBaseExtensions = Record<string, any>,
> =
  | DisposableSyncExecutor<TBaseContext, TBaseExtensions>
  | DisposableAsyncExecutor<TBaseContext, TBaseExtensions>;
