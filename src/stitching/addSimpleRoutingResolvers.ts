import { mapValues, isEmpty } from 'lodash';
import { printSchema, print, GraphQLError } from 'graphql';
import { GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';

type ResolverMap = { [key: string]: GraphQLFieldResolver<any, any> };

export type Fetcher = (
  operation: {
    query: string;
    operationName?: string;
    variables?: { [key: string]: any };
  },
) => Promise<{ data: { [key: string]: any }; errors: Array<GraphQLError> }>;

export default function addSimpleRoutingResolvers(
  schema: GraphQLSchema,
  fetcher: Fetcher,
): GraphQLSchema {
  const queries = schema.getQueryType().getFields();
  const queryResolvers: ResolverMap = mapValues(queries, (field, key) =>
    createResolver(fetcher, key),
  );
  let mutationResolvers: ResolverMap = {};
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutations = mutationType.getFields();
    mutationResolvers = mapValues(mutations, (field, key) =>
      createResolver(fetcher, key),
    );
  }

  const resolvers: {
    Query: ResolverMap;
    Mutation?: ResolverMap;
  } = {
    Query: queryResolvers,
    Mutation: mutationResolvers,
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
  fetcher: Fetcher,
  name: string,
): GraphQLFieldResolver<any, any> {
  return async (root, args, context, info) => {
    const query = print(info.operation);
    const result = await fetcher({
      query,
      variables: info.variableValues,
    });
    if (result.errors || !result.data[name]) {
      throw result.errors;
    } else {
      return result.data[name];
    }
  };
}
