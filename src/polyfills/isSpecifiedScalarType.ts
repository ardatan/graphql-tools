import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLScalarType,
  isNamedType,
} from 'graphql';

// FIXME: Replace with https://github.com/graphql/graphql-js/blob/master/src/type/scalars.js#L139
// Blocked by https://github.com/graphql/graphql-js/issues/2153

export const specifiedScalarTypes: Array<GraphQLScalarType> = [
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
];

export function isSpecifiedScalarType(type: any): boolean {
  return (
    isNamedType(type) &&
    // Would prefer to use specifiedScalarTypes.some(), however %checks needs
    // a simple expression.
    (type.name === GraphQLString.name ||
      type.name === GraphQLInt.name ||
      type.name === GraphQLFloat.name ||
      type.name === GraphQLBoolean.name ||
      type.name === GraphQLID.name)
  );
}
