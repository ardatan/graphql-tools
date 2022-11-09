import { Source, pipe, share, filter, takeUntil, mergeMap, merge, make } from 'wonka';

import {
  Exchange,
  ExecutionResult,
  makeResult,
  makeErrorResult,
  mergeResultPatch,
  Operation,
  OperationResult,
  getOperationName,
  OperationContext,
  ExchangeIO,
  AnyVariables,
} from '@urql/core';

import { ExecutionRequest, Executor, isAsyncIterable } from '@graphql-tools/utils';
import { OperationTypeNode } from 'graphql';

export function executorExchange(executor: Executor): Exchange {
  function makeYogaSource<TData extends Record<string, any>>(
    operation: Operation<TData>
  ): Source<OperationResult<TData>> {
    const operationName = getOperationName(operation.query);

    const extraFetchOptions =
      typeof operation.context.fetchOptions === 'function'
        ? operation.context.fetchOptions()
        : operation.context.fetchOptions;
    const executionRequest: ExecutionRequest<any, OperationContext> = {
      document: operation.query,
      operationName,
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
      Promise.resolve(executor(executionRequest))
        .then(async (result: ExecutionResult | AsyncIterable<ExecutionResult>) => {
          if (ended || !result) {
            return;
          }
          if (!isAsyncIterable(result)) {
            observer.next(makeResult(operation, result));
          } else {
            let prevResult: OperationResult<TData, AnyVariables> | null = null;

            for await (const value of result) {
              if (value) {
                prevResult = prevResult ? mergeResultPatch(prevResult, value) : makeResult(operation, value);
                observer.next(prevResult);
              }
              if (ended) {
                break;
              }
            }
          }
          observer.complete();
        })
        .catch(error => {
          observer.next(makeErrorResult(operation, error));
        })
        .finally(() => {
          ended = true;
          observer.complete();
        });
      return () => {
        ended = true;
      };
    });
  }
  return function executorExchangeFn({ forward }): ExchangeIO {
    return function executorExchangeIO<TData, TVariables extends AnyVariables>(
      ops$: Source<Operation<TData, TVariables>>
    ): Source<OperationResult<TData>> {
      const sharedOps$ = share(ops$);

      const executedOps$ = pipe(
        sharedOps$,
        filter(
          operation => operation.kind === 'query' || operation.kind === 'mutation' || operation.kind === 'subscription'
        ),
        mergeMap(operation => {
          const teardown$ = pipe(
            sharedOps$,
            filter(op => op.kind === 'teardown' && op.key === operation.key)
          );

          return pipe(makeYogaSource(operation), takeUntil(teardown$));
        })
      );

      const forwardedOps$ = pipe(
        sharedOps$,
        filter(operation => operation.kind === 'teardown'),
        forward
      );

      return merge([executedOps$, forwardedOps$]);
    };
  };
}
