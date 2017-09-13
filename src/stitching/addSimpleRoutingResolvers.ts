import { mapValues, isEmpty, values } from 'lodash';
import { printSchema, print, ExecutionResult } from 'graphql';
import {
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLInterfaceType,
  GraphQLUnionType,
} from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';
import resolveParentFromTypename from './resolveFromParentTypename';

type ResolverMap = { [key: string]: GraphQLFieldResolver<any, any> };

export type Fetcher = (
  operation: {
    query: string;
    operationName?: string;
    variables?: { [key: string]: any };
    context?: { [key: string]: any };
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

  const types = values(schema.getTypeMap());
  for (const type of types) {
    if (
      type instanceof GraphQLInterfaceType ||
      type instanceof GraphQLUnionType
    ) {
      resolvers[type.name] = {
        __resolveType(parent, context, info) {
          return resolveParentFromTypename(parent, info.schema);
        },
      };
    }
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
    const operation = print(info.operation);
    const fragments = values(info.fragments)
      .map(fragment => print(fragment))
      .join('\n');
    const query = `${operation}\n${fragments}`;
    const result = await fetcher({
      query,
      variables: info.variableValues,
      context,
    });
    if (result.errors || !result.data[name]) {
      throw result.errors;
    } else {
      return result.data[name];
    }
  };
}
