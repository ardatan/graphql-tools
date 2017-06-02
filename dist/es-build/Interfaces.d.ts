import { GraphQLSchema, GraphQLField, ExecutionResult, GraphQLType, GraphQLFieldResolver, GraphQLIsTypeOfFn, GraphQLTypeResolver, GraphQLScalarType, DocumentNode } from 'graphql';
export interface IResolverValidationOptions {
    requireResolversForArgs?: boolean;
    requireResolversForNonScalar?: boolean;
    requireResolversForAllFields?: boolean;
}
export interface IResolverOptions {
    resolve?: GraphQLFieldResolver<any, any>;
    __resolveType?: GraphQLTypeResolver<any, any>;
    __isTypeOf?: GraphQLIsTypeOfFn<any, any>;
}
export declare type ITypedef = (() => ITypedef[]) | string | DocumentNode;
export declare type ITypeDefinitions = ITypedef | ITypedef[];
export declare type IResolverObject = {
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
export declare type IConnectorFn = (context?: any) => any;
export declare type IConnector = IConnectorCls | IConnectorFn;
export declare type IConnectors = {
    [key: string]: IConnector;
};
export interface IExecutableSchemaDefinition {
    typeDefs: ITypeDefinitions;
    resolvers?: IResolvers;
    connectors?: IConnectors;
    logger?: ILogger;
    allowUndefinedInResolve?: boolean;
    resolverValidationOptions?: IResolverValidationOptions;
}
export declare type IFieldIteratorFn = (fieldDef: GraphQLField<any, any>, typeName: string, fieldName: string) => void;
export declare type IMockFn = GraphQLFieldResolver<any, any>;
export declare type IMocks = {
    [key: string]: IMockFn;
};
export declare type IMockTypeFn = (type: GraphQLType, typeName?: string, fieldName?: string) => GraphQLFieldResolver<any, any>;
export interface IMockOptions {
    schema: GraphQLSchema;
    mocks?: IMocks;
    preserveResolvers?: boolean;
}
export interface IMockServer {
    query: (query: string, vars?: {
        [key: string]: any;
    }) => Promise<ExecutionResult>;
}
export interface IPubSub {
    publish(triggerName: string, payload: any): any;
}
