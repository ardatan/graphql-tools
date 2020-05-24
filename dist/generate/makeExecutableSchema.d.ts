import { GraphQLSchema } from 'graphql';
import { IExecutableSchemaDefinition, ILogger } from '../Interfaces';
export declare function makeExecutableSchema<TContext = any>({ typeDefs, resolvers, connectors, logger, allowUndefinedInResolve, resolverValidationOptions, directiveResolvers, schemaDirectives, parseOptions, inheritResolversFromInterfaces, }: IExecutableSchemaDefinition<TContext>): GraphQLSchema;
export declare function addCatchUndefinedToSchema(schema: GraphQLSchema): void;
export declare function addErrorLoggingToSchema(schema: GraphQLSchema, logger?: ILogger): void;
