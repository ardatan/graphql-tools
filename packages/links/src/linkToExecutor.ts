import { ApolloLink, execute, FetchResult } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
import { toPromise } from '@apollo/client/link/utils';
import { ExecutionParams } from './types';

export const linkToExecutor = (link: ApolloLink) => <TReturn, TArgs, TContext>(
  params: ExecutionParams<TArgs, TContext>
) => {
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
    }) as Observable<FetchResult<TReturn>>
  );
};
