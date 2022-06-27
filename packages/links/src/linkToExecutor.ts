import * as apolloImport from '@apollo/client';

import {
  Executor,
  ExecutionRequest,
  ExecutionResult,
  observableToAsyncIterable,
  getOperationASTFromRequest,
} from '@graphql-tools/utils';

const apollo: typeof apolloImport = (apolloImport as any)?.default ?? apolloImport;

export function linkToExecutor(link: apolloImport.ApolloLink): Executor {
  return function executorFromLink<TReturn, TArgs extends Record<string, any>, TContext>(
    request: ExecutionRequest<TArgs, TContext>
  ) {
    const observable = apollo.execute(link, {
      query: request.document,
      operationName: request.operationName,
      variables: request.variables,
      context: {
        graphqlContext: request.context,
        graphqlResolveInfo: request.info,
        clientAwareness: {},
      },
      extensions: request.extensions,
    }) as apolloImport.Observable<ExecutionResult<TReturn>>;
    const operationAst = getOperationASTFromRequest(request);
    if (operationAst.operation === 'subscription') {
      return observableToAsyncIterable<ExecutionResult<TReturn>>(observable);
    }
    return apollo.toPromise(observable);
  };
}
