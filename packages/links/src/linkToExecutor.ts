import { ApolloLink, execute } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
import { toPromise } from '@apollo/client/link/utils';

import { Executor, ExecutionParams } from '@graphql-tools/delegate';
import { ExecutionResult } from '@graphql-tools/utils';

export const linkToExecutor = (link: ApolloLink): Executor => <TReturn, TArgs, TContext>(
  params: ExecutionParams<TArgs, TContext>
): ExecutionResult<TReturn> | Promise<ExecutionResult<TReturn>> => {
  const { document, variables, extensions, context, info } = params;
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
    }) as Observable<ExecutionResult<TReturn>>
  );
};
