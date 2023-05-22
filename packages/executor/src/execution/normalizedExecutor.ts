import { getOperationAST } from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import { ExecutionResult, MaybeAsyncIterable, MaybePromise } from '@graphql-tools/utils';
import { execute, ExecutionArgs, flattenIncrementalResults, subscribe } from './execute.js';

export function normalizedExecutor<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
): MaybePromise<MaybeAsyncIterable<ExecutionResult<TData>>> {
  const operationAST = getOperationAST(args.document, args.operationName);
  if (operationAST == null) {
    throw new Error('Must provide an operation.');
  }
  if (!args.signal && args.contextValue?.request?.signal) {
    args.signal = args.contextValue.request.signal;
  }
  if (operationAST.operation === 'subscription') {
    return subscribe(args);
  }
  return new ValueOrPromise(() => execute(args))
    .then((result): MaybeAsyncIterable<ExecutionResult<TData>> => {
      if ('initialResult' in result) {
        return flattenIncrementalResults(result, args.signal);
      }
      return result;
    })
    .resolve()!;
}
