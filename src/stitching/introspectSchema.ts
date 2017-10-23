import { GraphQLSchema } from 'graphql';
import { introspectionQuery, buildClientSchema } from 'graphql';
import { ApolloLink } from 'apollo-link';
import { Fetcher } from './makeRemoteExecutableSchema';
import linkToFetcher from './linkToFetcher';

export default async function introspectSchema(
  fetcher: ApolloLink | Fetcher,
  linkContext?: { [key: string]: any },
): Promise<GraphQLSchema> {
  // Convert link to fetcher
  if ((fetcher as ApolloLink).request) {
    fetcher = linkToFetcher(fetcher as ApolloLink);
  }

  const introspectionResult = await (fetcher as Fetcher)({
    query: introspectionQuery,
    context: linkContext,
  });

  if (introspectionResult.errors || !introspectionResult.data.__schema) {
    throw introspectionResult.errors;
  } else {
    const schema = buildClientSchema(introspectionResult.data as {
      __schema: any;
    });
    return schema;
  }
}
