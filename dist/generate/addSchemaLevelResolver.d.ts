import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';
declare function addSchemaLevelResolver(schema: GraphQLSchema, fn: GraphQLFieldResolver<any, any>): void;
export default addSchemaLevelResolver;
