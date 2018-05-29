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
  // @ts-ignore-next-line TODO remove comment when @types/graphql correctly exports getDescription
  getDescription
} from 'graphql';
import resolveFromParentType from './resolveFromParentTypename';

const backcompatOptions = { commentDescriptions: true };

export type GetType = (
  name: string,
  // this is a hack
  type: 'object' | 'interface' | 'input',
) => GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType;

export default function typeFromAST(
  node: DefinitionNode,
  getType: GetType,
): GraphQLNamedType | null {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeObjectType(node, getType);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceType(node, getType);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumType(node, getType);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionType(node, getType);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarType(node, getType);
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectType(node, getType);
    default:
      return null;
  }
}

function makeObjectType(
  node: ObjectTypeDefinitionNode,
  getType: GetType,
): GraphQLObjectType {
  return new GraphQLObjectType({
    name: node.name.value,
    fields: () => makeFields(node.fields, getType),
    interfaces: () =>
      node.interfaces.map(
        iface => getType(iface.name.value, 'interface') as GraphQLInterfaceType,
      ),
    description: getDescription(node, backcompatOptions),
  });
}

function makeInterfaceType(
  node: InterfaceTypeDefinitionNode,
  getType: GetType,
): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: node.name.value,
    fields: () => makeFields(node.fields, getType),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeEnumType(
  node: EnumTypeDefinitionNode,
  getType: GetType,
): GraphQLEnumType {
  const values = {};
  node.values.forEach(value => {
    values[value.name.value] = {
      description: getDescription(value, backcompatOptions),
    };
  });
  return new GraphQLEnumType({
    name: node.name.value,
    values,
    description: getDescription(node, backcompatOptions),
  });
}

function makeUnionType(
  node: UnionTypeDefinitionNode,
  getType: GetType,
): GraphQLUnionType {
  return new GraphQLUnionType({
    name: node.name.value,
    types: () =>
      node.types.map(
        type => resolveType(type, getType, 'object') as GraphQLObjectType,
      ),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeScalarType(
  node: ScalarTypeDefinitionNode,
  getType: GetType,
): GraphQLScalarType {
  return new GraphQLScalarType({
    name: node.name.value,
    description: getDescription(node, backcompatOptions),
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
  node: InputObjectTypeDefinitionNode,
  getType: GetType,
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: node.name.value,
    fields: () => makeValues(node.fields, getType),
    description: getDescription(node, backcompatOptions),
  });
}

function makeFields(nodes: Array<FieldDefinitionNode>, getType: GetType) {
  const result = {};
  nodes.forEach(node => {
    result[node.name.value] = {
      type: resolveType(node.type, getType, 'object'),
      args: makeValues(node.arguments, getType),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function makeValues(nodes: Array<InputValueDefinitionNode>, getType: GetType) {
  const result = {};
  nodes.forEach(node => {
    const type = resolveType(node.type, getType, 'input') as GraphQLInputType;
    result[node.name.value] = {
      type,
      defaultValue: valueFromAST(node.defaultValue, type),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function resolveType(
  node: TypeNode,
  getType: GetType,
  type: 'object' | 'interface' | 'input',
): GraphQLType {
  switch (node.kind) {
    case Kind.LIST_TYPE:
      return new GraphQLList(resolveType(node.type, getType, type));
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveType(node.type, getType, type));
    default:
      return getType(node.name.value, type);
  }
}
