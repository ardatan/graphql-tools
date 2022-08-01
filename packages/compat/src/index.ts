import {
  getDocumentNodeFromSchema,
  GraphQLSchema as ToolSchema,
  buildASTSchema as buildASTToolsSchema,
  addResolversToExistingSchema as addResolversToExistingToolsSchema,
} from '@graphql-tools/graphql';
import { getResolversFromSchema as getResolversFromToolsSchema } from '@graphql-tools/utils';
import { GraphQLSchema, buildASTSchema as buildASTGraphQLJSSchema } from 'graphql';
import { addResolversToExistingSchema as addResolversToExistingGraphQLJSSchema } from './add-resolvers-to-schema.js';
import { getDocumentNodeFromSchema as getDocumentNodeFromGraphqlJSSchema } from './graphql-js/get-document-node-from-schema';
import { getResolversFromSchema as getResolversFromGraphQLJSSchema } from './graphql-js/get-resolvers-from-schema';

export const compatSchema = {
  /**
   * Covert a Tools Schema to GraphQL.js compatible Schema
   */
  toGraphQLJS: (schema: ToolSchema): GraphQLSchema => {
    const typeDefs = getDocumentNodeFromSchema(schema);
    const resolvers = getResolversFromToolsSchema(schema);
    // @ts-expect-error yes this is a valid document node
    const newSchema = buildASTGraphQLJSSchema(typeDefs);
    addResolversToExistingGraphQLJSSchema(newSchema, resolvers);
    return newSchema;
  },
  /**
   * Covert a GraphQL.js Schema to Tools compatible Schema
   */
  toTools: (schema: GraphQLSchema): ToolSchema => {
    const typeDefs = getDocumentNodeFromGraphqlJSSchema(schema);
    const resolvers = getResolversFromGraphQLJSSchema(schema);
    // @ts-expect-error yes this is a valid document node
    const newSchema = buildASTToolsSchema(typeDefs);
    addResolversToExistingToolsSchema(newSchema, resolvers);
    return newSchema;
  },
};
