import fetch from 'isomorphic-fetch';
import { GraphQLSchema } from 'graphql';
import { introspectionQuery, buildClientSchema } from 'graphql';
import addSimpleRoutingResolvers from './addSimpleRoutingResolvers';

export default async function makeRemoteExecutableSchema(
  endpointURL: string,
): Promise<GraphQLSchema> {
  const introspectionResponse = await fetch(endpointURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: introspectionQuery,
    }),
  });
  const introspectionResult = await introspectionResponse.json();
  const schema = buildClientSchema(introspectionResult.data);
  return addSimpleRoutingResolvers(schema, endpointURL);
}
