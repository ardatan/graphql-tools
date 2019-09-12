import {
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLString,
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

export function isStub(type: GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType): boolean {
  const fields = type.getFields();
  const fieldNames = Object.keys(fields);
  return fieldNames.length === 1 && fields[fieldNames[0]].name === '__fake';
}
