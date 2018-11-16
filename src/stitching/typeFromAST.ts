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
  getDescription,
  GraphQLString,
  GraphQLDirective,
  DirectiveDefinitionNode,
  DirectiveLocationEnum,
  DirectiveLocation,
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
): GraphQLNamedType | GraphQLDirective | null {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeObjectType(node);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceType(node);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumType(node);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionType(node);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarType(node);
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectType(node);
    case Kind.DIRECTIVE_DEFINITION:
      return makeDirective(node);
    default:
      return null;
  }
}

function makeObjectType(
  node: ObjectTypeDefinitionNode,
): GraphQLObjectType {
  return new GraphQLObjectType({
    name: node.name.value,
    fields: () => makeFields(node.fields),
    interfaces: () =>
      node.interfaces.map(
        iface => createNamedStub(iface.name.value, 'interface') as GraphQLInterfaceType,
      ),
    description: getDescription(node, backcompatOptions),
  });
}

function makeInterfaceType(
  node: InterfaceTypeDefinitionNode,
): GraphQLInterfaceType {
  return new GraphQLInterfaceType({
    name: node.name.value,
    fields: () => makeFields(node.fields),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeEnumType(
  node: EnumTypeDefinitionNode,
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
): GraphQLUnionType {
  return new GraphQLUnionType({
    name: node.name.value,
    types: () =>
      node.types.map(
        type => resolveType(type, 'object') as GraphQLObjectType,
      ),
    description: getDescription(node, backcompatOptions),
    resolveType: (parent, context, info) =>
      resolveFromParentType(parent, info.schema),
  });
}

function makeScalarType(
  node: ScalarTypeDefinitionNode,
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
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: node.name.value,
    fields: () => makeValues(node.fields),
    description: getDescription(node, backcompatOptions),
  });
}

function makeFields(nodes: ReadonlyArray<FieldDefinitionNode>) {
  const result = {};
  nodes.forEach(node => {
    result[node.name.value] = {
      type: resolveType(node.type, 'object'),
      args: makeValues(node.arguments),
      description: getDescription(node, backcompatOptions),
    };
  });
  return result;
}

function makeValues(nodes: ReadonlyArray<InputValueDefinitionNode>) {
  const result = {};
  nodes.forEach(node => {
    const type = resolveType(node.type, 'input') as GraphQLInputType;
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
  type: 'object' | 'interface' | 'input',
): GraphQLType {
  switch (node.kind) {
    case Kind.LIST_TYPE:
      return new GraphQLList(resolveType(node.type, type));
    case Kind.NON_NULL_TYPE:
      return new GraphQLNonNull(resolveType(node.type, type));
    default:
      return createNamedStub(node.name.value, type);
  }
}

function createNamedStub(
  name: string,
  type: 'object' | 'interface' | 'input'
): GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType {
  let constructor: any;
  if (type === 'object') {
    constructor = GraphQLObjectType;
  } else if (type === 'interface') {
    constructor = GraphQLInterfaceType;
  } else {
    constructor = GraphQLInputObjectType;
  }

  return new constructor({
    name,
    fields: {
      __fake: {
        type: GraphQLString,
      },
    },
  });
}

function makeDirective(node: DirectiveDefinitionNode): GraphQLDirective {
  const locations: Array<DirectiveLocationEnum> = [];
  node.locations.forEach(location => {
    if (<DirectiveLocationEnum>location.value in DirectiveLocation) {
      locations.push(<DirectiveLocationEnum>location.value);
    }
  });
  return new GraphQLDirective({
    name: node.name.value,
    description: node.description ? node.description.value : null,
    args: makeValues(node.arguments),
    locations,
  });
}
