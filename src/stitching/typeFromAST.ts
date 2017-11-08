import {
  DefinitionNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLType,
  GraphQLUnionType,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  TypeNode,
  UnionTypeDefinitionNode,
  valueFromAST,
} from 'graphql';
import { getDescription } from 'graphql/utilities/buildASTSchema';
import resolveFromParentType from './resolveFromParentTypename';
import TypeRegistry from './TypeRegistry';

export default function typeFromAST(
  typeRegistry: TypeRegistry,
  node: DefinitionNode,
): GraphQLNamedType | null {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeObjectType(typeRegistry, node);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceType(typeRegistry, node);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumType(typeRegistry, node);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionType(typeRegistry, node);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarType(typeRegistry, node);
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectType(typeRegistry, node);
    default:
      return null;
  }
}

function makeObjectType(
  typeRegistry: TypeRegistry,
  node: ObjectTypeDefinitionNode,
): GraphQLObjectType {
  return new GraphQLObjectType({
    name: node.name.value,
    fields: () => makeFields(typeRegistry, node.fields),
    interfaces: () =>
      node.interfaces.map(
        iface => typeRegistry.getType(iface.name.value) as GraphQLInterfaceType,
      ),
    description: getDescription(node),
  });
}

function makeInterfaceType(
  typeRegistry: TypeRegistry,
  node: InterfaceTypeDefinitionNode,
): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: node.name.value,
    fields: () => makeFields(typeRegistry, node.fields),
    description: getDescription(node),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeEnumType(
  typeRegistry: TypeRegistry,
  node: EnumTypeDefinitionNode,
): GraphQLEnumType {
  const values = {};
  node.values.forEach(value => {
    values[value.name.value] = {
      description: getDescription(value),
    };
  });
  return new GraphQLEnumType({
    name: node.name.value,
    values,
    description: getDescription(node),
  });
}

function makeUnionType(
  typeRegistry: TypeRegistry,
  node: UnionTypeDefinitionNode,
): GraphQLUnionType {
  return new GraphQLUnionType({
    name: node.name.value,
    types: () =>
      node.types.map(
        type => resolveType(typeRegistry, type) as GraphQLObjectType,
      ),
    description: getDescription(node),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeScalarType(
  typeRegistry: TypeRegistry,
  node: ScalarTypeDefinitionNode,
): GraphQLScalarType {
  return new GraphQLScalarType({
    name: node.name.value,
    description: getDescription(node),
    serialize: () => null,
    // Note: validation calls the parse functions to determine if a
    // literal value is correct. Returning null would cause use of custom
    // scalars to always fail validation. Returning false causes them to
    // always pass validation.
    parseValue: () => false,
    parseLiteral: () => false,
  });
}

function makeInputObjectType(
  typeRegistry: TypeRegistry,
  node: InputObjectTypeDefinitionNode,
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: node.name.value,
    fields: () => makeValues(typeRegistry, node.fields),
    description: getDescription(node),
  });
}

function makeFields(
  typeRegistry: TypeRegistry,
  nodes: Array<FieldDefinitionNode>,
) {
  const result = {};
  nodes.forEach(node => {
    result[node.name.value] = {
      type: resolveType(typeRegistry, node.type),
      args: makeValues(typeRegistry, node.arguments),
      description: getDescription(node),
    };
  });
  return result;
}

function makeValues(
  typeRegistry: TypeRegistry,
  nodes: Array<InputValueDefinitionNode>,
) {
  const result = {};
  nodes.forEach(node => {
    const type = resolveType(typeRegistry, node.type) as GraphQLInputType;
    result[node.name.value] = {
      type,
      defaultValue: valueFromAST(node.defaultValue, type),
      description: getDescription(node),
    };
  });
  return result;
}

function resolveType(typeRegistry: TypeRegistry, node: TypeNode): GraphQLType {
  switch (node.kind) {
    case Kind.LIST_TYPE:
      return new GraphQLList(resolveType(typeRegistry, node.type));
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveType(typeRegistry, node.type));
    default:
      return typeRegistry.getType(node.name.value);
  }
}
