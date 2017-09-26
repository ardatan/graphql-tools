import { GraphQLSchema } from 'graphql';
import { introspectionQuery, buildClientSchema } from 'graphql';
import makeRemoteExecutableSchema, {
  Fetcher,
} from './makeRemoteExecutableSchema';

export default async function makeRemoteExecutableSchemaFromIntrospection(
  fetcher: Fetcher,
): Promise<GraphQLSchema> {
  const introspectionResult = await fetcher({
    query: introspectionQuery,
  });
  if (introspectionResult.errors || !introspectionResult.data.__schema) {
    throw introspectionResult.errors;
  } else {
    const schema = buildClientSchema(introspectionResult.data as {
      __schema: any;
    });
    return makeRemoteExecutableSchema({ schema, fetcher });
  }
}
