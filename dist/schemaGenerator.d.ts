import { GraphQLSchema, GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql';
import { IExecutableSchemaDefinition, ILogger, IResolvers, ITypeDefinitions, ITypedef, IFieldIteratorFn, IResolverValidationOptions } from './Interfaces';
declare class SchemaError extends Error {
    message: string;
    constructor(message: string);
}
declare function makeExecutableSchema({typeDefs, resolvers, connectors, logger, allowUndefinedInResolve, resolverValidationOptions}: IExecutableSchemaDefinition): GraphQLSchema;
declare function concatenateTypeDefs(typeDefinitionsAry: ITypedef[], calledFunctionRefs?: any): string;
declare function buildSchemaFromTypeDefinitions(typeDefinitions: ITypeDefinitions): GraphQLSchema;
declare function forEachField(schema: GraphQLSchema, fn: IFieldIteratorFn): void;
declare const attachConnectorsToContext: Function;
declare function addSchemaLevelResolveFunction(schema: GraphQLSchema, fn: GraphQLFieldResolver<any, any>): void;
declare function addResolveFunctionsToSchema(schema: GraphQLSchema, resolveFunctions: IResolvers): void;
declare function assertResolveFunctionsPresent(schema: GraphQLSchema, resolverValidationOptions?: IResolverValidationOptions): void;
declare function addErrorLoggingToSchema(schema: GraphQLSchema, logger: ILogger): void;
declare function chainResolvers(resolvers: GraphQLFieldResolver<any, any>[]): (root: any, args: {
    [argName: string]: any;
}, ctx: any, info: GraphQLResolveInfo) => any;
declare function addCatchUndefinedToSchema(schema: GraphQLSchema): void;
export { makeExecutableSchema, SchemaError, forEachField, chainResolvers, addErrorLoggingToSchema, addResolveFunctionsToSchema, addCatchUndefinedToSchema, assertResolveFunctionsPresent, buildSchemaFromTypeDefinitions, addSchemaLevelResolveFunction, attachConnectorsToContext, concatenateTypeDefs };
