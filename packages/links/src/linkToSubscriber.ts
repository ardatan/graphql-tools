import { ApolloLink, execute, FetchResult } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
import { observableToAsyncIterable } from '@graphql-tools/utils';
import { GraphQLResolveInfo, DocumentNode } from 'graphql';

export const linkToSubscriber = (link: ApolloLink) => async <TReturn, TArgs, TContext>({
  document,
  variables,
  context,
  info,
}: {
  document: DocumentNode;
  variables: TArgs;
  context: TContext;
  info: GraphQLResolveInfo;
}) =>
  observableToAsyncIterable(
    execute(link, {
      query: document,
      variables,
      context: {
        graphqlContext: context,
        graphqlResolveInfo: info,
        clientAwareness: {},
      },
    }) as Observable<FetchResult<TReturn>>
  );
