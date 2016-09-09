import {
    GraphQLSchema,
    GraphQLFieldDefinition,
    GraphQLResolveInfo,
    GraphQLResult,
    GraphQLType,
} from 'graphql';

/* TODO: Add documentation */

export interface IResolverValidationOptions {
    requireResolversForArgs?: boolean;
    requireResolversForNonScalar?: boolean;
    requireResolversForAllFields?: boolean;
}

export type ITypedef = (() => ITypedef[]) | string;
export type ITypeDefinitions = ITypedef | ITypedef[];
export type IResolveTypeFn = (data: any, context: any, info: GraphQLResolveInfo) => any;
export type IResolveFn = (rootObject?: any, args?: { [key: string]: any }, context?: any, info?: GraphQLResolveInfo) => any;
export type IResolverObject = { [key: string]: IResolveFn | {resolve?: IResolveFn, __resolveType?: IResolveTypeFn}};
export interface IResolvers {
    [key: string]: (() => any) | IResolverObject;
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
    resolvers: IResolvers;
    connectors?: IConnectors;
    logger?: ILogger;
    allowUndefinedInResolve?: boolean;
    resolverValidationOptions?: IResolverValidationOptions;
}

export type IFieldIteratorFn = (fieldDef: GraphQLFieldDefinition, typeName: string, fieldName: string) => void;

export type IMockFn = IResolveFn;
export type IMocks = { [key: string]: IMockFn };
export type IMockTypeFn = (type: GraphQLType, typeName?: string, fieldName?: string) => IResolveFn;

export interface IMockOptions {
    schema: GraphQLSchema;
    mocks?: IMocks;
    preserveResolvers?: boolean;
}

export interface IMockServer {
    query: (query: string, vars?: { [key: string]: any }) => Promise<GraphQLResult>;
}
