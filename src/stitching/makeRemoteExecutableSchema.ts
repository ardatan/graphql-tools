import { GraphQLSchema } from 'graphql';
import { introspectionQuery, buildClientSchema } from 'graphql';
import addSimpleRoutingResolvers, {
  Fetcher,
} from './addSimpleRoutingResolvers';

export default async function makeRemoteExecutableSchema(
  fetcher: Fetcher,
): Promise<GraphQLSchema> {
  const introspectionResult = await fetcher({
    query: introspectionQuery,
  });
  if (introspectionResult.errors || !introspectionResult.data.__schema) {
    throw introspectionResult.errors;
  } else {
    const schema = buildClientSchema(
      introspectionResult.data as { __schema: any },
    );
    return addSimpleRoutingResolvers(schema, fetcher);
  }
}
