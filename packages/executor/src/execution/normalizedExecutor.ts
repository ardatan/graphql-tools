import { getOperationAST, GraphQLSchema } from 'graphql';
import { ValueOrPromise } from 'value-or-promise';
import {
  ExecutionRequest,
  ExecutionResult,
  Executor,
  MaybeAsyncIterable,
  MaybePromise,
  memoize1,
} from '@graphql-tools/utils';
import { execute, ExecutionArgs, flattenIncrementalResults, subscribe } from './execute.js';

export function normalizedExecutor<TData = any, TVariables = any, TContext = any>(
  args: ExecutionArgs<TData, TVariables, TContext>,
): MaybePromise<MaybeAsyncIterable<ExecutionResult<TData>>> {
  const operationAST = getOperationAST(args.document, args.operationName);
  if (operationAST == null) {
    throw new Error('Must provide an operation.');
  }
  if (operationAST.operation === 'subscription') {
    return subscribe(args);
  }
  return new ValueOrPromise(() => execute(args))
    .then((result): MaybeAsyncIterable<ExecutionResult<TData>> => {
      if ('initialResult' in result) {
        return flattenIncrementalResults(result);
      }
      return result;
    })
    .resolve()!;
}

export const executorFromSchema = memoize1(function executorFromSchema(
  schema: GraphQLSchema,
): Executor {
  return function schemaExecutor(request: ExecutionRequest) {
    return normalizedExecutor({
      schema,
      document: request.document,
      variableValues: request.variables,
      operationName: request.operationName,
      rootValue: request.rootValue,
      contextValue: request.context,
      signal: request.signal || request.info?.signal,
    });
  };
});
