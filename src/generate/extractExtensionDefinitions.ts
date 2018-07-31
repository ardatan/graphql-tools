import { DocumentNode, DefinitionNode } from 'graphql';

const newExtensionDefinitionKind = 'ObjectTypeExtension';
const interfaceExtensionDefinitionKind = 'InterfaceTypeExtension';

export default function extractExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      (def.kind as any) === newExtensionDefinitionKind ||
      (def.kind as any) === interfaceExtensionDefinitionKind,
  );

  return Object.assign({}, ast, {
    definitions: extensionDefs,
  });
}
