import {
  GraphQLSchema,
  GraphQLField,
  ExecutionResult,
  GraphQLType,
  GraphQLFieldResolver,
  GraphQLIsTypeOfFn,
  GraphQLTypeResolver,
  GraphQLScalarType,
  DocumentNode,
} from 'graphql';

/* TODO: Add documentation */

export interface IResolverValidationOptions {
  requireResolversForArgs?: boolean;
  requireResolversForNonScalar?: boolean;
  requireResolversForAllFields?: boolean;
}

export interface IResolverOptions {
  resolve?: GraphQLFieldResolver<any, any>;
  subscribe?: GraphQLFieldResolver<any, any>;
  __resolveType?: GraphQLTypeResolver<any, any>;
  __isTypeOf?: GraphQLIsTypeOfFn<any, any>;
}

export type ITypedef = (() => ITypedef[]) | string | DocumentNode;
export type ITypeDefinitions = ITypedef | ITypedef[];
export type IResolverObject = {
  [key: string]: GraphQLFieldResolver<any, any> | IResolverOptions;
};
export interface IResolvers {
  [key: string]: (() => any) | IResolverObject | GraphQLScalarType;
}
export interface ILogger {
  log: (message: string | Error) => void;
}

export interface IConnectorCls {
  new (context?: any): any;
}
export type IConnectorFn = (context?: any) => any;
export type IConnector = IConnectorCls | IConnectorFn;

export type IConnectors = { [key: string]: IConnector };

export interface IExecutableSchemaDefinition {
  typeDefs: ITypeDefinitions;
  resolvers?: IResolvers;
  connectors?: IConnectors;
  logger?: ILogger;
  allowUndefinedInResolve?: boolean;
  resolverValidationOptions?: IResolverValidationOptions;
}

export type IFieldIteratorFn = (
  fieldDef: GraphQLField<any, any>,
  typeName: string,
  fieldName: string,
) => void;

/* XXX on mocks, args are optional, Not sure if a bug. */
export type IMockFn = GraphQLFieldResolver<any, any>;
export type IMocks = { [key: string]: IMockFn };
export type IMockTypeFn = (
  type: GraphQLType,
  typeName?: string,
  fieldName?: string,
) => GraphQLFieldResolver<any, any>;

export interface IMockOptions {
  schema: GraphQLSchema;
  mocks?: IMocks;
  preserveResolvers?: boolean;
}

export interface IMockServer {
  query: (
    query: string,
    vars?: { [key: string]: any },
  ) => Promise<ExecutionResult>;
}
