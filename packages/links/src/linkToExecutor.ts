import { ApolloLink, execute, Observable, toPromise } from '@apollo/client/core';
import {
  Executor,
  ExecutionRequest,
  ExecutionResult,
  observableToAsyncIterable,
  getOperationASTFromRequest,
} from '@graphql-tools/utils';

export function linkToExecutor(link: ApolloLink): Executor {
  return function executorFromLink<TReturn, TArgs extends Record<string, any>, TContext>(
    request: ExecutionRequest<TArgs, TContext>
  ) {
    const observable = execute(link, {
      query: request.document,
      operationName: request.operationName,
      variables: request.variables,
      context: {
        graphqlContext: request.context,
        graphqlResolveInfo: request.info,
        clientAwareness: {},
      },
      extensions: request.extensions,
    }) as Observable<ExecutionResult<TReturn>>;
    const operationAst = getOperationASTFromRequest(request);
    if (operationAst.operation === 'subscription') {
      return observableToAsyncIterable<ExecutionResult<TReturn>>(observable);
    }
    return toPromise(observable);
  };
}
