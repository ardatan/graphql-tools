import { toPromise } from '@apollo/client/core';
import { ApolloLink, execute } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';

import { Executor, ExecutionRequest, ExecutionResult, observableToAsyncIterable } from '@graphql-tools/utils';

export const linkToExecutor =
  (link: ApolloLink): Executor =>
  async <TReturn, TArgs, TContext>(params: ExecutionRequest<TArgs, TContext>) => {
    const { document, variables, extensions, context, operationType, operationName, info } = params;
    const observable = execute(link, {
      query: document,
      variables,
      context: {
        graphqlContext: context,
        graphqlResolveInfo: info,
        clientAwareness: {},
      },
      extensions,
      operationName,
    }) as Observable<ExecutionResult<TReturn>>;
    if (operationType === 'subscription') {
      return observableToAsyncIterable<ExecutionResult<TReturn>>(observable)[Symbol.asyncIterator]();
    }
    return toPromise(observable);
  };
