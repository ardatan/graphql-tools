import { getOperationAST, GraphQLSchema } from 'graphql';
import {
  ExecutionRequest,
  ExecutionResult,
  Executor,
  MaybeAsyncIterable,
} from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
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

const executorFromSchemaCache = new WeakMap<GraphQLSchema, Executor>();

export function executorFromSchema(schema: GraphQLSchema): Executor {
  let schemaExecutor = executorFromSchemaCache.get(schema);
  if (schemaExecutor === undefined) {
    schemaExecutor = function schemaExecutor(request: ExecutionRequest) {
      return normalizedExecutor({
        schema,
        document: request.document,
        variableValues: request.variables,
        operationName: request.operationName,
        rootValue: request.rootValue,
        contextValue: request.context,
        signal: request.signal || request.info?.signal,
        schemaCoordinateInErrors: request.schemaCoordinateInErrors,
        incrementalSpec: request.incrementalSpec,
      });
    };
    executorFromSchemaCache.set(schema, schemaExecutor);
  }
  return schemaExecutor;
}
