import { mapValues, isEmpty, values } from 'lodash';
import { printSchema, print, ExecutionResult } from 'graphql';
import {
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLID,
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLScalarType,
} from 'graphql';
import { IResolvers, IResolverObject } from '../Interfaces';
import { makeExecutableSchema } from '../schemaGenerator';
import resolveParentFromTypename from './resolveFromParentTypename';

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
  const queryResolvers: IResolverObject = mapValues(queries, (field, key) =>
    createResolver(fetcher, key),
  );
  let mutationResolvers: IResolverObject = {};
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutations = mutationType.getFields();
    mutationResolvers = mapValues(mutations, (field, key) =>
      createResolver(fetcher, key),
    );
  }

  const resolvers: IResolvers = { [queryType.name]: queryResolvers };

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
    } else if (type instanceof GraphQLScalarType) {
      if (
        !(
          type === GraphQLID ||
          type === GraphQLString ||
          type === GraphQLFloat ||
          type === GraphQLBoolean ||
          type === GraphQLInt
        )
      ) {
        const fakeScalar = new GraphQLScalarType({
          name: type.name,
          description: type.description,
          serialize(value) {
            return GraphQLString.serialize(value);
          },
          parseValue(value) {
            return GraphQLString.parseValue(value);
          },
          parseLiteral(ast) {
            return GraphQLString.parseLiteral(ast);
          },
        });
        resolvers[type.name] = fakeScalar;
      }
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
