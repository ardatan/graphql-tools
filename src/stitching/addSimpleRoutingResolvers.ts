import { mapValues, isEmpty } from 'lodash';
import { printSchema, print, ExecutionResult } from 'graphql';
import { GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';

type ResolverMap = { [key: string]: GraphQLFieldResolver<any, any> };

export type Fetcher = (
  operation: {
    query: string;
    operationName?: string;
    variables?: { [key: string]: any };
  },
) => Promise<ExecutionResult>;

export default function addSimpleRoutingResolvers(
  schema: GraphQLSchema,
  fetcher: Fetcher,
): GraphQLSchema {
  const queryType = schema.getQueryType();
  const queries = queryType.getFields();
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

  const resolvers = { [queryType.name]: queryResolvers };

  if (!isEmpty(mutationResolvers)) {
    resolvers[mutationType.name] = mutationResolvers;
  }

  const typeDefs = printSchema(schema);

  return makeExecutableSchema({
    typeDefs,
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
