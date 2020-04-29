import {
  TypeNode,
  DefinitionNode,
  EnumTypeDefinitionNode,
  NamedTypeNode,
  ListTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  Source,
  UnionTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  DirectiveDefinitionNode,
  SchemaDefinitionNode,
  ObjectTypeExtensionNode,
  InputObjectTypeExtensionNode,
  EnumTypeExtensionNode,
  UnionTypeExtensionNode,
  ScalarTypeExtensionNode,
  InterfaceTypeExtensionNode,
  Kind,
} from 'graphql';

export function isStringTypes(types: any): types is string {
  return typeof types === 'string';
}

export function isSourceTypes(types: any): types is Source {
  return types instanceof Source;
}

export function isGraphQLType(definition: DefinitionNode): definition is ObjectTypeDefinitionNode {
  return definition.kind === 'ObjectTypeDefinition';
}

export function isGraphQLTypeExtension(definition: DefinitionNode): definition is ObjectTypeExtensionNode {
  return definition.kind === 'ObjectTypeExtension';
}

export function isGraphQLEnum(definition: DefinitionNode): definition is EnumTypeDefinitionNode {
  return definition.kind === 'EnumTypeDefinition';
}

export function isGraphQLEnumExtension(definition: DefinitionNode): definition is EnumTypeExtensionNode {
  return definition.kind === 'EnumTypeExtension';
}

export function isGraphQLUnion(definition: DefinitionNode): definition is UnionTypeDefinitionNode {
  return definition.kind === 'UnionTypeDefinition';
}

export function isGraphQLUnionExtension(definition: DefinitionNode): definition is UnionTypeExtensionNode {
  return definition.kind === 'UnionTypeExtension';
}

export function isGraphQLScalar(definition: DefinitionNode): definition is ScalarTypeDefinitionNode {
  return definition.kind === 'ScalarTypeDefinition';
}

export function isGraphQLScalarExtension(definition: DefinitionNode): definition is ScalarTypeExtensionNode {
  return definition.kind === 'ScalarTypeExtension';
}

export function isGraphQLInputType(definition: DefinitionNode): definition is InputObjectTypeDefinitionNode {
  return definition.kind === 'InputObjectTypeDefinition';
}

export function isGraphQLInputTypeExtension(definition: DefinitionNode): definition is InputObjectTypeExtensionNode {
  return definition.kind === 'InputObjectTypeExtension';
}

export function isGraphQLInterface(definition: DefinitionNode): definition is InterfaceTypeDefinitionNode {
  return definition.kind === 'InterfaceTypeDefinition';
}

export function isGraphQLInterfaceExtension(definition: DefinitionNode): definition is InterfaceTypeExtensionNode {
  return definition.kind === 'InterfaceTypeExtension';
}

export function isGraphQLDirective(definition: DefinitionNode): definition is DirectiveDefinitionNode {
  return definition.kind === 'DirectiveDefinition';
}

export function extractType(type: TypeNode): NamedTypeNode {
  let visitedType = type;
  while (visitedType.kind === 'ListType' || visitedType.kind === 'NonNullType') {
    visitedType = visitedType.type;
  }
  return visitedType as any;
}

export function isSchemaDefinition(node: DefinitionNode): node is SchemaDefinitionNode {
  return node.kind === 'SchemaDefinition';
}

export function isWrappingTypeNode(type: TypeNode): type is ListTypeNode | NonNullTypeNode {
  return type.kind !== Kind.NAMED_TYPE;
}

export function isListTypeNode(type: TypeNode): type is ListTypeNode {
  return type.kind === Kind.LIST_TYPE;
}

export function isNonNullTypeNode(type: TypeNode): type is NonNullTypeNode {
  return type.kind === Kind.NON_NULL_TYPE;
}

export function printTypeNode(type: TypeNode): string {
  if (isListTypeNode(type)) {
    return `[${printTypeNode(type.type)}]`;
  }

  if (isNonNullTypeNode(type)) {
    return `${printTypeNode(type.type)}!`;
  }

  return type.name.value;
}
