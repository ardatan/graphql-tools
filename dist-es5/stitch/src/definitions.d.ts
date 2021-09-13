import {
  DocumentNode,
  TypeExtensionNode,
  SchemaExtensionNode,
  SchemaDefinitionNode,
  TypeDefinitionNode,
  DirectiveDefinitionNode,
} from 'graphql';
export declare function extractDefinitions(ast: DocumentNode): {
  typeDefinitions: TypeDefinitionNode[];
  directiveDefs: DirectiveDefinitionNode[];
  schemaDefs: SchemaDefinitionNode[];
  schemaExtensions: SchemaExtensionNode[];
  extensionDefs: TypeExtensionNode[];
};
