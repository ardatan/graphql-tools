import { GraphQLFieldResolver, GraphQLType, GraphQLSchema, ExecutionResult } from 'graphql';

/* XXX on mocks, args are optional, Not sure if a bug. */
export type IMockFn = GraphQLFieldResolver<any, any>;

export interface IMocks {
  [key: string]: IMockFn;
}

export type IMockTypeFn = (type: GraphQLType, typeName?: string, fieldName?: string) => GraphQLFieldResolver<any, any>;

export interface IMockOptions {
  schema?: GraphQLSchema;
  mocks?: IMocks;
  preserveResolvers?: boolean;
}

export interface IMockServer {
  query: (query: string, vars?: Record<string, any>) => Promise<ExecutionResult>;
}
