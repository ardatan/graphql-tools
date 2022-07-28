import { getDocumentNodeFromSchema, GraphQLSchema as ToolSchema } from '@graphql-tools/graphql';
import { getResolversFromSchema } from '@graphql-tools/utils';
import { GraphQLSchema, buildASTSchema } from 'graphql';
import { addResolversToExistingSchema } from './add-resolvers-to-schema.js';

export const compatSchema = (schema: ToolSchema): GraphQLSchema => {
  const typeDefs = getDocumentNodeFromSchema(schema);
  const resolvers = getResolversFromSchema(schema);
  // @ts-expect-error yes this is a valid document node
  const newSchema = buildASTSchema(typeDefs);
  addResolversToExistingSchema(newSchema, resolvers);
  return newSchema;
};
