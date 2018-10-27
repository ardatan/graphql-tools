import { DocumentNode, DefinitionNode } from 'graphql';

const newExtensionDefinitionKind = 'ObjectTypeExtension';
const interfaceExtensionDefinitionKind = 'InterfaceTypeExtension';
const inputObjectExtensionDefinitionKind = 'InputObjectTypeExtension';
const unionExtensionDefinitionKind = 'UnionTypeExtension';
const enumExtensionDefinitionKind = 'EnumTypeExtension';

export default function extractExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs = ast.definitions.filter(
    (def: DefinitionNode) =>
      (def.kind as any) === newExtensionDefinitionKind ||
      (def.kind as any) === interfaceExtensionDefinitionKind ||
      (def.kind as any) === inputObjectExtensionDefinitionKind ||
      (def.kind as any) === unionExtensionDefinitionKind ||
      (def.kind as any) === enumExtensionDefinitionKind,
  );

  return Object.assign({}, ast, {
    definitions: extensionDefs,
  });
}
