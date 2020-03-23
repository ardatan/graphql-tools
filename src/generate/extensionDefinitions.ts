import { DocumentNode, DefinitionNode, Kind } from 'graphql';

import { graphqlVersion } from '../utils/index';

export function extractExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      def.kind === Kind.OBJECT_TYPE_EXTENSION ||
      (graphqlVersion() >= 13 && def.kind === Kind.INTERFACE_TYPE_EXTENSION) ||
      def.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION ||
      def.kind === Kind.UNION_TYPE_EXTENSION ||
      def.kind === Kind.ENUM_TYPE_EXTENSION ||
      def.kind === Kind.SCALAR_TYPE_EXTENSION ||
      def.kind === Kind.SCHEMA_EXTENSION,
  );

  return {
    ...ast,
    definitions: extensionDefs,
  };
}

export function filterExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      def.kind !== Kind.OBJECT_TYPE_EXTENSION &&
      def.kind !== Kind.INTERFACE_TYPE_EXTENSION &&
      def.kind !== Kind.INPUT_OBJECT_TYPE_EXTENSION &&
      def.kind !== Kind.UNION_TYPE_EXTENSION &&
      def.kind !== Kind.ENUM_TYPE_EXTENSION &&
      def.kind !== Kind.SCALAR_TYPE_EXTENSION &&
      def.kind !== Kind.SCHEMA_EXTENSION,
  );

  return {
    ...ast,
    definitions: extensionDefs,
  };
}
