import {
    GraphQLSchema,
    GraphQLFieldDefinition,
    GraphQLResult,
    GraphQLType,
    GraphQLFieldResolveFn,
    GraphQLIsTypeOfFn,
    GraphQLTypeResolveFn,
    GraphQLScalarType,
} from 'graphql';

/* TODO: Add documentation */

export interface IResolverValidationOptions {
    requireResolversForArgs?: boolean;
    requireResolversForNonScalar?: boolean;
    requireResolversForAllFields?: boolean;
}

export interface IResolverOptions {
    resolve?: GraphQLFieldResolveFn;
    __resolveType?: GraphQLTypeResolveFn;
    __isTypeOf?: GraphQLIsTypeOfFn;
};

export type ITypedef = (() => ITypedef[]) | string;
export type ITypeDefinitions = ITypedef | ITypedef[];
export type IResolverObject = { [key: string]: GraphQLFieldResolveFn | IResolverOptions };
export interface IResolvers {
    [key: string]: (() => any) | IResolverObject | GraphQLScalarType;
};
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

export type IFieldIteratorFn = (fieldDef: GraphQLFieldDefinition, typeName: string, fieldName: string) => void;

/* XXX on mocks, args are optional, Not sure if a bug. */
export type IMockFn = GraphQLFieldResolveFn;
export type IMocks = { [key: string]: IMockFn };
export type IMockTypeFn = (type: GraphQLType, typeName?: string, fieldName?: string) => GraphQLFieldResolveFn;

export interface IMockOptions {
    schema: GraphQLSchema;
    mocks?: IMocks;
    preserveResolvers?: boolean;
}

export interface IMockServer {
    query: (query: string, vars?: { [key: string]: any }) => Promise<GraphQLResult>;
}
