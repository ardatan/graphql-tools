import { ApolloLink, execute, FetchResult, Observable } from 'apollo-link';

import { Subscriber, ExecutionParams } from '@graphql-tools/schema-stitching';

import { observableToAsyncIterable } from './observableToAsyncIterable';

export const linkToSubscriber = (link: ApolloLink): Subscriber => async <TReturn, TArgs, TContext>({
  document,
  variables,
  context,
  info,
}: ExecutionParams<TArgs, TContext>) =>
  observableToAsyncIterable(
    execute(link, {
      query: document,
      variables,
      context: {
        graphqlContext: context,
        graphqlResolveInfo: info,
      },
    }) as Observable<FetchResult<TReturn>>
  );
