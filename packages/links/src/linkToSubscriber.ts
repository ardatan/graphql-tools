import { ApolloLink, execute, FetchResult, Observable } from 'apollo-link';
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
