import { ApolloLink, toPromise, execute, Observable, FetchResult, DocumentNode } from 'apollo-link';
import { GraphQLResolveInfo } from 'graphql/type';

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
