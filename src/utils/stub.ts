import {
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLNamedType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
} from 'graphql';

export function createNamedStub(
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

export function isStub(type: GraphQLNamedType): boolean {
  if (
    type instanceof GraphQLObjectType ||
    type instanceof GraphQLInterfaceType ||
    type instanceof GraphQLInterfaceType
  ) {
    const fields = type.getFields();
    const fieldNames = Object.keys(fields);
    return fieldNames.length === 1 && fields[fieldNames[0]].name === '__fake';
  }

  return false;
}

export function getBuiltInForStub(type: GraphQLNamedType): GraphQLNamedType {
  switch (type.name) {
    case GraphQLInt.name:
      return GraphQLInt;
    case GraphQLFloat.name:
      return GraphQLFloat;
    case GraphQLString.name:
      return GraphQLString;
    case GraphQLBoolean.name:
      return GraphQLBoolean;
    case GraphQLID.name:
      return GraphQLID;
    default:
      return type;
    }
}
