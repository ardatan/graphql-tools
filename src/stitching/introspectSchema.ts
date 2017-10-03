import { GraphQLSchema, parse } from 'graphql';
import { introspectionQuery, buildClientSchema } from 'graphql';
import { ApolloLink, execute, makePromise } from 'apollo-link';
import { Fetcher, fetcherToLink } from './makeRemoteExecutableSchema';

export default async function introspectSchema(
  link: ApolloLink | Fetcher,
  context?: { [key: string]: any },
): Promise<GraphQLSchema> {
  if (!(link as ApolloLink).request) {
    link = fetcherToLink(link as Fetcher);
  }
  const introspectionResult = await makePromise(execute((link as ApolloLink), {
    query: typeof introspectionQuery === 'string' ? parse(introspectionQuery) : introspectionQuery,
    context,
  }));
  if (introspectionResult.errors || !introspectionResult.data.__schema) {
    throw introspectionResult.errors;
  } else {
    const schema = buildClientSchema(introspectionResult.data as {
      __schema: any;
    });
    return schema;
  }
}
