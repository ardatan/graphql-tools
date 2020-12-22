import { GraphQLSchema, BuildSchemaOptions, buildSchema } from 'graphql';
import { SchemaPrintOptions } from './types';
import { printSchemaWithDirectives } from './print-schema-with-directives';

function buildFixedSchema(schema: GraphQLSchema, options: BuildSchemaOptions & SchemaPrintOptions) {
  return buildSchema(printSchemaWithDirectives(schema), {
    noLocation: true,
    ...(options || {}),
  });
}

export function fixSchemaAst(schema: GraphQLSchema, options: BuildSchemaOptions & SchemaPrintOptions) {
  let schemaWithValidAst: GraphQLSchema;
  if (!schema.astNode || !schema.extensionASTNodes) {
    schemaWithValidAst = buildFixedSchema(schema, options);
  }

  if (!schema.astNode) {
    schema.astNode = schemaWithValidAst.astNode;
  }
  if (!schema.extensionASTNodes) {
    schema.extensionASTNodes = schemaWithValidAst.extensionASTNodes;
  }
  return schema;
}
