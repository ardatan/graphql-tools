import { DocumentNode, DefinitionNode } from 'graphql';

// This was changed in graphql@0.12
// See https://github.com/apollographql/graphql-tools/pull/541
// TODO fix types https://github.com/apollographql/graphql-tools/issues/542
const oldTypeExtensionDefinitionKind = 'TypeExtensionDefinition';
const newExtensionDefinitionKind = 'ObjectTypeExtension';
const interfaceExtensionDefinitionKind = 'InterfaceTypeExtension';

export default function extractExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      def.kind === oldTypeExtensionDefinitionKind ||
      (def.kind as any) === newExtensionDefinitionKind ||
      (def.kind as any) === interfaceExtensionDefinitionKind,
  );

  return Object.assign({}, ast, {
    definitions: extensionDefs,
  });
}
