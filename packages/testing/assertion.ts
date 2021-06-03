import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
} from 'graphql';

export function assertGraphQLObjectType(input: unknown): asserts input is GraphQLObjectType {
  if (input instanceof GraphQLObjectType) {
    return;
  }
  throw new Error('Expected GraphQLObjectType.');
}
export function assertGraphQLEnumType(input: unknown): asserts input is GraphQLEnumType {
  if (input instanceof GraphQLEnumType) {
    return;
  }
  throw new Error('Expected GraphQLObjectType.');
}
export function assertGraphQLScalerType(input: unknown): asserts input is GraphQLScalarType {
  if (input instanceof GraphQLScalarType) {
    return;
  }
  throw new Error('Expected GraphQLScalerType.');
}
export function assertGraphQLInterfaceType(input: unknown): asserts input is GraphQLInterfaceType {
  if (input instanceof GraphQLInterfaceType) {
    return;
  }
  throw new Error('Expected GraphQLInterfaceType.');
}
export function assertGraphQLUnionType(input: unknown): asserts input is GraphQLUnionType {
  if (input instanceof GraphQLUnionType) {
    return;
  }
  throw new Error('Expected GraphQLUnionType.');
}
export function assertGraphQLInputObjectType(input: unknown): asserts input is GraphQLInputObjectType {
  if (input instanceof GraphQLInputObjectType) {
    return;
  }
  throw new Error('Expected GraphQLInputObjectType.');
}
