// Type definitions for graphql 0.6.5
// Project: https://github.com/apollostack/graphql-tools
// Definitions by: Hagai Cohen <https://github.com/DxCx>

import { GraphQLSchema, GraphQLFieldDefinition, GraphQLResolveInfo, GraphQLResult } from "graphql";

// schemaGenerator.js
interface IResolverValidationOptions {
    requireResolversForArgs?: boolean;
    requireResolversForNonScalar?: boolean;
    requireResolversForAllFields?: boolean;
}

type ITypedef = (() => string) | string;
type ITypeDefinitions = string | Array<ITypedef>;
type IResolveFn = (rootObject: any, args: { [key: string]: any }, context: any, info: GraphQLResolveInfo) => any;
type IResolverObject = { [key: string]: IResolveFn };
type IResolvers = { [key: string]: IResolverObject };
interface ILogger {
    log: (message: string) => void;
}

interface IConnector {
    new (context: any): any;
}
type IConnectors = { [key: string]: IConnector };

interface IExecutableSchemaDefinition {
    typeDefs: ITypeDefinitions;
    resolvers: IResolvers;
    connectors?: IConnectors;
    logger?: ILogger;
    allowUndefinedInResolve?: boolean;
    resolverValidationOptions?: IResolverValidationOptions;
}

type IFieldIteratorFn = (fieldDef: GraphQLFieldDefinition, typeName: string, fieldName: string) => void;

export function makeExecutableSchema(definition: IExecutableSchemaDefinition): GraphQLSchema;
export function buildSchemaFromTypeDefinitions(definition: ITypeDefinitions): GraphQLSchema;
export function addErrorLoggingToSchema(schema: GraphQLSchema, logger: ILogger): void;
export function forEachField(schema: GraphQLSchema, fn: IFieldIteratorFn): void;
export function addResolveFunctionsToSchema(schema: GraphQLSchema, resolveFunctions: IResolvers): void;
export function addCatchUndefinedToSchema(schema: GraphQLSchema): void;
export function assertResolveFunctionsPresent(schema: GraphQLSchema, addCatchUndefinedToSchema: IResolverValidationOptions): void;
export function addSchemaLevelResolveFunction(schema: GraphQLSchema, fn: IResolveFn): void;
export function attachConnectorsToContext(schema: GraphQLSchema, connectors: IConnectors): void;

// mock.js
type IMockFn = () => any;
type IMocks = { [key: string] : IMockFn };

interface IMockOptions {
    schema: GraphQLSchema;
    mocks?: IMocks;
    preserveResolvers?: boolean;
}

interface IMockServer {
    query: (query: string, vars: { [key: string]: any }) => Promise<GraphQLResult>;
}

export function mockServer(schema: GraphQLSchema, mocks: IMocks, preserveResolvers: boolean): IMockServer;
export function addMockFunctionsToSchema(mockOptions: IMockOptions): void;
export class MockList {
    constructor (len: number | Array<number>, wrappedFunction?: IMockFn);
    public mock(root: any, args: { [key: string]: any }, context: any, info: any, fieldType: any, mockTypeFunc: IResolveFn): void;
}
