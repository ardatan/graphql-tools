import { getOperationAST, GraphQLSchema } from 'graphql';
import {
  ExecutionRequest,
  ExecutionResult,
  Executor,
  MaybeAsyncIterable,
  MaybePromise,
  memoize1,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import {
  execute,
  ExecutionArgs,
  flattenIncrementalResults,
  isIncrementalResults,
  subscribe,
} from './execute.js';

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
  return handleMaybePromise(
    () => execute(args),
    result => {
      if (isIncrementalResults(result)) {
        return flattenIncrementalResults(result);
      }
      return result;
    },
  );
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
