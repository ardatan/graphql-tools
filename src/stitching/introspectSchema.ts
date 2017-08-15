import { GraphQLSchema } from 'graphql';
import { introspectionQuery, buildClientSchema } from 'graphql';
import { Fetcher } from './makeRemoteExecutableSchema';

export default async function introspectSchema(
  fetcher: Fetcher,
  context?: { [key: string]: any },
): Promise<GraphQLSchema> {
  const introspectionResult = await fetcher({
    query: introspectionQuery,
    context,
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
