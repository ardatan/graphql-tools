import { GraphQLSchema } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { IMockStore, IMocks, TypePolicy } from './types';
declare type IMockOptions = {
  schema: GraphQLSchema;
  store?: IMockStore;
  mocks?: IMocks;
  typePolicies?: {
    [typeName: string]: TypePolicy;
  };
  resolvers?: IResolvers | ((store: IMockStore) => IResolvers);
  /**
   * Set to `true` to prevent existing resolvers from being
   * overwritten to provide mock data. This can be used to mock some parts of the
   * server and not others.
   */
  preserveResolvers?: boolean;
};
/**
 * Given a `schema` and a `MockStore`, returns an executable schema that
 * will use the provided `MockStore` to execute queries.
 *
 * ```ts
 * const schema = buildSchema(`
 *  type User {
 *    id: ID!
 *    name: String!
 *  }
 *  type Query {
 *    me: User!
 *  }
 * `)
 *
 * const store = createMockStore({ schema });
 * const mockedSchema = addMocksToSchema({ schema, store });
 * ```
 *
 *
 * If a `resolvers` parameter is passed, the query execution will use
 * the provided `resolvers` if, one exists, instead of the default mock
 * resolver.
 *
 *
 * ```ts
 * const schema = buildSchema(`
 *   type User {
 *     id: ID!
 *     name: String!
 *   }
 *   type Query {
 *     me: User!
 *   }
 *   type Mutation {
 *     setMyName(newName: String!): User!
 *   }
 * `)
 *
 * const store = createMockStore({ schema });
 * const mockedSchema = addMocksToSchema({
 *   schema,
 *   store,
 *   resolvers: {
 *     Mutation: {
 *       setMyName: (_, { newName }) => {
 *          const ref = store.get('Query', 'ROOT', 'viewer');
 *          store.set(ref, 'name', newName);
 *          return ref;
 *       }
 *     }
 *   }
 *  });
 * ```
 *
 *
 * `Query` and `Mutation` type will use `key` `'ROOT'`.
 */
export declare function addMocksToSchema({
  schema,
  store: maybeStore,
  mocks,
  typePolicies,
  resolvers: resolversOrFnResolvers,
  preserveResolvers,
}: IMockOptions): GraphQLSchema;
export {};
