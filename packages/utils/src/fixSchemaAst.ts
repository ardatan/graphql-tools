import { buildASTSchema, BuildSchemaOptions, GraphQLSchema } from 'graphql';
import { getDocumentNodeFromSchema } from './print-schema-with-directives.js';
import { SchemaPrintOptions } from './types.js';

function buildFixedSchema(schema: GraphQLSchema, options: BuildSchemaOptions & SchemaPrintOptions) {
  const document = getDocumentNodeFromSchema(schema);
  return buildASTSchema(document, {
    ...(options || {}),
  });
}

export function fixSchemaAst(
  schema: GraphQLSchema,
  options: BuildSchemaOptions & SchemaPrintOptions,
) {
  // eslint-disable-next-line no-undef-init
  let schemaWithValidAst: GraphQLSchema | undefined = undefined;
  if (!schema.astNode || !schema.extensionASTNodes) {
    schemaWithValidAst = buildFixedSchema(schema, options);
  }

  if (!schema.astNode && schemaWithValidAst?.astNode) {
    schema.astNode = schemaWithValidAst.astNode;
  }
  if (!schema.extensionASTNodes && schemaWithValidAst?.astNode) {
    schema.extensionASTNodes = schemaWithValidAst.extensionASTNodes;
  }
  return schema;
}
