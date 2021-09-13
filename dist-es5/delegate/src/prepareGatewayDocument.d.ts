import { DocumentNode, GraphQLSchema, GraphQLOutputType } from 'graphql';
export declare function prepareGatewayDocument(
  originalDocument: DocumentNode,
  transformedSchema: GraphQLSchema,
  returnType: GraphQLOutputType,
  infoSchema?: GraphQLSchema
): DocumentNode;
