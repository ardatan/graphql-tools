import fetch from 'isomorphic-fetch';
import { mapValues, isEmpty } from 'lodash';
import { printSchema, print } from 'graphql';
import { GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';

type ResolverMap = { [key: string]: GraphQLFieldResolver<any, any> };

export default function addSimpleRoutingResolvers(
  schema: GraphQLSchema,
  // prolly should be a fetcher function like (query) => Promise<result>
  endpointURL: string,
): GraphQLSchema {
  const queries = schema.getQueryType().getFields();
  const queryResolvers: ResolverMap = mapValues(queries, (field, key) =>
    createResolver(endpointURL, key),
  );
  let mutationResolvers: ResolverMap = {};
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutations = mutationType.getFields();
    mutationResolvers = mapValues(mutations, (field, key) =>
      createResolver(endpointURL, key),
    );
  }

  const resolvers: {
    Query: ResolverMap;
    Mutation?: ResolverMap;
  } = {
    Query: queryResolvers,
  };

  if (!isEmpty(mutationResolvers)) {
    resolvers.Mutation = mutationResolvers;
  }

  return makeExecutableSchema({
    typeDefs: printSchema(schema),
    resolvers,
  });
}

function createResolver(
  endpointURL: string,
  name: string,
): GraphQLFieldResolver<any, any> {
  return async (root, args, context, info) => {
    const query = print(info.operation);
    const response = await fetch(endpointURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: info.variableValues,
      }),
    });
    const result = await response.json();
    if (result.errors || !result.data[name]) {
      throw new Error(result.errors[0].message);
    } else {
      return result.data[name];
    }
  };
}
