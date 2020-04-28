import { ApolloLink, toPromise, execute, Observable, FetchResult } from 'apollo-link';

import { AsyncExecutor, ExecutionParams } from '@graphql-tools/utils';

export const linkToExecutor = (link: ApolloLink): AsyncExecutor => <TReturn, TArgs, TContext>({
  document,
  variables,
  context,
  info,
}: ExecutionParams<TArgs, TContext>) =>
  toPromise(
    execute(link, {
      query: document,
      variables,
      context: {
        graphqlContext: context,
        graphqlResolveInfo: info,
      },
    }) as Observable<FetchResult<TReturn>>
  );
