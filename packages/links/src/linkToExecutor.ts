import { ApolloLink, execute, FetchResult } from '@apollo/client/link/core';
import { Observable } from '@apollo/client/utilities';
import { toPromise } from '@apollo/client/link/utils';
import { DocumentNode, GraphQLResolveInfo } from 'graphql';

export const linkToExecutor = (link: ApolloLink) => <TReturn, TArgs, TContext>({
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
  toPromise(
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
