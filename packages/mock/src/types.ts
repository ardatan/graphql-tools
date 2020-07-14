import { GraphQLFieldResolver, GraphQLType, GraphQLSchema } from 'graphql';

import { ExecutionResult } from '@graphql-tools/utils';

// XXX on mocks, args are optional, Not sure if a bug.
export type IMockFn = GraphQLFieldResolver<any, any>;

export interface IMocks {
  [key: string]: IMockFn;
}

/**
 * @internal
 */
export type IMockTypeFn = (type: GraphQLType, typeName?: string, fieldName?: string) => GraphQLFieldResolver<any, any>;

export interface IMockOptions {
  /**
   * The schema to which to add mocks. This can also be a set of type definitions instead.
   */
  schema?: GraphQLSchema;
  /**
   * The mocks to add to the schema.
   */
  mocks?: IMocks;
  /**
   * Set to `true` to prevent existing resolvers from being overwritten to provide
   * mock data. This can be used to mock some parts of the server and not others.
   */
  preserveResolvers?: boolean;
}

export interface IMockServer {
  /**
   * Executes the provided query against the mocked schema.
   * @param query GraphQL query to execute
   * @param vars Variables
   */
  query: (query: string, vars?: Record<string, any>) => Promise<ExecutionResult>;
}
