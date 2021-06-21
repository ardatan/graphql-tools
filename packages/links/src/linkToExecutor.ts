import { ApolloLink, execute } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
import { toPromise } from '@apollo/client/link/utils';

import { AsyncExecutor, ExecutionParams, ExecutionResult } from '@graphql-tools/utils';

export const linkToExecutor =
  (link: ApolloLink): AsyncExecutor =>
  <TReturn, TArgs, TContext>(params: ExecutionParams<TArgs, TContext>): Promise<ExecutionResult<TReturn>> => {
    const { document, variables, extensions, context, info, operationName } = params;
    return toPromise(
      execute(link, {
        query: document,
        variables: variables,
        context: {
          graphqlContext: context,
          graphqlResolveInfo: info,
          clientAwareness: {},
        },
        extensions,
        operationName,
      }) as Observable<ExecutionResult<TReturn>>
    );
  };
