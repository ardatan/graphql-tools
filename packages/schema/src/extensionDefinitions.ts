import { DocumentNode, DefinitionNode, Kind } from 'graphql';

const isExtensionNode = (def: DefinitionNode) =>
  def.kind === Kind.OBJECT_TYPE_EXTENSION ||
  def.kind === Kind.INTERFACE_TYPE_EXTENSION ||
  def.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION ||
  def.kind === Kind.UNION_TYPE_EXTENSION ||
  def.kind === Kind.ENUM_TYPE_EXTENSION ||
  def.kind === Kind.SCALAR_TYPE_EXTENSION ||
  def.kind === Kind.SCHEMA_EXTENSION;

export function filterAndExtractExtensionDefinitions(ast: DocumentNode) {
  const extensionDefs: DefinitionNode[] = [];
  const typesDefs: DefinitionNode[] = [];
  ast.definitions.forEach(def => {
    if (isExtensionNode(def)) {
      extensionDefs.push(def);
    } else {
      typesDefs.push(def);
    }
  });

  return {
    typesAst: {
      ...ast,
      definitions: typesDefs,
    },
    extensionsAst: {
      ...ast,
      definitions: extensionDefs,
    },
  };
}

export function filterExtensionDefinitions(ast: DocumentNode) {
  const { typesAst } = filterAndExtractExtensionDefinitions(ast);
  return typesAst;
}

export function extractExtensionDefinitions(ast: DocumentNode) {
  const { extensionsAst } = filterAndExtractExtensionDefinitions(ast);
  return extensionsAst;
}
