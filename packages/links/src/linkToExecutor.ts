import { ApolloLink, toPromise, execute, Observable, FetchResult } from 'apollo-link';
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
      },
    }) as Observable<FetchResult<TReturn>>
  );
