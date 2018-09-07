import { DocumentNode, DefinitionNode } from 'graphql';

const newExtensionDefinitionKind = 'ObjectTypeExtension';
const interfaceExtensionDefinitionKind = 'InterfaceTypeExtension';
const inputObjectExtensionDefinitionKind = 'InputObjectTypeExtension';

export default function extractExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      (def.kind as any) === newExtensionDefinitionKind ||
      (def.kind as any) === interfaceExtensionDefinitionKind ||
      (def.kind as any) === inputObjectExtensionDefinitionKind,
  );

  return Object.assign({}, ast, {
    definitions: extensionDefs,
  });
}
