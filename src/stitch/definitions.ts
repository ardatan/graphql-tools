import {
  DocumentNode,
  DefinitionNode,
  Kind,
  SchemaExtensionNode,
  SchemaDefinitionNode,
} from 'graphql';

export function extractTypeDefinitions(ast: DocumentNode) {
  const typeDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      def.kind === Kind.OBJECT_TYPE_DEFINITION ||
      def.kind === Kind.INTERFACE_TYPE_DEFINITION ||
      def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
      def.kind === Kind.UNION_TYPE_DEFINITION ||
      def.kind === Kind.ENUM_TYPE_DEFINITION ||
      def.kind === Kind.SCALAR_TYPE_DEFINITION,
  );

  return {
    ...ast,
    definitions: typeDefs,
  };
}

export function extractDirectiveDefinitions(ast: DocumentNode) {
  const directiveDefs = ast.definitions.filter(
    (def: DefinitionNode) => def.kind === Kind.DIRECTIVE_DEFINITION,
  );

  return {
    ...ast,
    definitions: directiveDefs,
  };
}

export function extractSchemaDefinition(
  ast: DocumentNode,
): SchemaDefinitionNode {
  const schemaDefs = ast.definitions.filter(
    (def: DefinitionNode) => def.kind === Kind.SCHEMA_DEFINITION,
  ) as Array<SchemaDefinitionNode>;

  return schemaDefs.length ? schemaDefs[schemaDefs.length - 1] : null;
}

export function extractSchemaExtensions(
  ast: DocumentNode,
): Array<SchemaExtensionNode> {
  const schemaExtensions = ast.definitions.filter(
    (def: DefinitionNode) => def.kind === Kind.SCHEMA_EXTENSION,
  ) as Array<SchemaExtensionNode>;

  return schemaExtensions;
}

export function extractTypeExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      def.kind === Kind.OBJECT_TYPE_EXTENSION ||
      def.kind === Kind.INTERFACE_TYPE_EXTENSION ||
      def.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION ||
      def.kind === Kind.UNION_TYPE_EXTENSION ||
      def.kind === Kind.ENUM_TYPE_EXTENSION ||
      def.kind === Kind.SCALAR_TYPE_EXTENSION,
  );

  return {
    ...ast,
    definitions: extensionDefs,
  };
}
