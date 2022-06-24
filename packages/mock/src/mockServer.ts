import { TypeSource } from '@graphql-tools/utils';
import { isSchema, graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from './addMocksToSchema.js';
import { IMockServer, IMocks } from './types.js';

/**
 * A convenience wrapper on top of addMocksToSchema. It adds your mock resolvers
 * to your schema and returns a client that will correctly execute your query with
 * variables. Note: when executing queries from the returned server, context and
 * root will both equal `{}`.
 * @param schema The schema to which to add mocks. This can also be a set of type
 * definitions instead.
 * @param mocks The mocks to add to the schema.
 * @param preserveResolvers Set to `true` to prevent existing resolvers from being
 * overwritten to provide mock data. This can be used to mock some parts of the
 * server and not others.
 */
export function mockServer<TResolvers>(
  schema: TypeSource,
  mocks: IMocks<TResolvers>,
  preserveResolvers = false
): IMockServer {
  const mockedSchema = addMocksToSchema({
    schema: isSchema(schema)
      ? schema
      : makeExecutableSchema({
          typeDefs: schema,
        }),
    mocks,
    preserveResolvers,
  });

  return {
    query: (query, vars) =>
      graphql({
        schema: mockedSchema,
        source: query,
        rootValue: {},
        contextValue: {},
        variableValues: vars,
      }),
  };
}
