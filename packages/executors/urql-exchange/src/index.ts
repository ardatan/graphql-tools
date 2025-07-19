import { OperationTypeNode } from 'graphql';
import { filter, make, merge, mergeMap, pipe, share, Source, takeUntil } from 'wonka';
import { ExecutionRequest, Executor, isAsyncIterable } from '@graphql-tools/utils';
import {
  AnyVariables,
  Exchange,
  ExchangeIO,
  ExecutionResult,
  makeErrorResult,
  makeResult,
  mergeResultPatch,
  Operation,
  OperationContext,
  OperationResult,
} from '@urql/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export function executorExchange(executor: Executor): Exchange {
  function makeYogaSource<TData extends Record<string, any>>(
    operation: Operation<TData>,
  ): Source<OperationResult<TData>> {
    const extraFetchOptions =
      typeof operation.context.fetchOptions === 'function'
        ? operation.context.fetchOptions()
        : operation.context.fetchOptions;
    const executionRequest: ExecutionRequest<any, OperationContext> = {
      document: operation.query,
      operationType: operation.kind as OperationTypeNode,
      variables: operation.variables,
      context: operation.context,
      extensions: {
        endpoint: operation.context.url,
        fetch: operation.context.fetch,
        useGETForQueries: operation.context.preferGetMethod,
        headers: extraFetchOptions?.headers,
        method: extraFetchOptions?.method,
      },
    };
    return make<OperationResult<TData>>(observer => {
      let ended = false;
      let iterator: AsyncIterator<ExecutionResult>;
      handleMaybePromise(
        () => executor(executionRequest),
        result => {
          if (ended || !result) {
            return;
          }
          if (!isAsyncIterable(result)) {
            observer.next(makeResult(operation, result as ExecutionResult));
            observer.complete();
          } else {
            let prevResult: OperationResult<TData, AnyVariables> | null = null;

            iterator = result[Symbol.asyncIterator]() as AsyncIterator<ExecutionResult>;
            function iterate() {
              if (ended) {
                return;
              }
              return iterator.next().then(({ value, done }) => {
                if (done) {
                  return;
                }
                if (value) {
                  if (prevResult && value.incremental) {
                    prevResult = mergeResultPatch(prevResult, value as ExecutionResult);
                  } else {
                    prevResult = makeResult(operation, value as ExecutionResult);
                  }
                  observer.next(prevResult);
                }
                return iterate();
              });
            }
            return handleMaybePromise(
              () => iterate(),
              () => observer.complete(),
            );
          }
        },
        error => {
          observer.next(makeErrorResult(operation, error));
          ended = true;
          observer.complete();
        },
      );
      return () => {
        iterator?.return?.();
        ended = true;
      };
    });
  }
  return function executorExchangeFn({ forward }): ExchangeIO {
    return function executorExchangeIO<TData, TVariables extends AnyVariables>(
      ops$: Source<Operation<TData, TVariables>>,
    ): Source<OperationResult<TData>> {
      const sharedOps$ = share(ops$);

      const executedOps$ = pipe(
        sharedOps$,
        filter(
          (operation: Operation<TData, TVariables>) =>
            operation.kind === 'query' ||
            operation.kind === 'mutation' ||
            operation.kind === 'subscription',
        ),
        mergeMap((operation: Operation<TData, TVariables>) => {
          const teardown$ = pipe(
            sharedOps$,
            filter(
              (op: Operation<TData, TVariables>) =>
                op.kind === 'teardown' && op.key === operation.key,
            ),
          );

          return pipe(makeYogaSource(operation), takeUntil(teardown$));
        }),
      );

      const forwardedOps$ = pipe(
        sharedOps$,
        filter((operation: Operation<TData, TVariables>) => operation.kind === 'teardown'),
        forward,
      );

      return merge([executedOps$, forwardedOps$]);
    };
  };
}
