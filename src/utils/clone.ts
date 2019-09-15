import {
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
} from 'graphql';
import { healTypes } from './heal';
import isSpecifiedScalarType from './isSpecifiedScalarType';

export function cloneDirective(directive: GraphQLDirective): GraphQLDirective {
  return new GraphQLDirective(directive.toConfig());
}

export function cloneType(type: GraphQLNamedType): GraphQLNamedType {
  if (type instanceof GraphQLObjectType) {
    const config = type.toConfig();
    return new GraphQLObjectType({
      ...config,
      interfaces: config.interfaces.slice(),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    return new GraphQLInterfaceType(type.toConfig());
  } else if (type instanceof GraphQLUnionType) {
    const config = type.toConfig();
    return new GraphQLUnionType({
      ...config,
      types: config.types.slice(),
    });
  } else if (type instanceof GraphQLInputObjectType) {
    return new GraphQLInputObjectType(type.toConfig());
  } else if (type instanceof GraphQLEnumType) {
    return new GraphQLEnumType(type.toConfig());
  } else if (type instanceof GraphQLScalarType) {
    return isSpecifiedScalarType(type) ? type : new GraphQLScalarType(type.toConfig());
  } else {
    throw new Error(`Invalid type ${type}`);
  }
}

export function cloneSchema(schema: GraphQLSchema): GraphQLSchema {
  const newDirectives = schema.getDirectives().map(directive => cloneDirective(directive));

  const originalTypeMap = schema.getTypeMap();
  const newTypeMap = {};

  Object.keys(originalTypeMap).forEach(typeName => {
    if (!typeName.startsWith('__')) {
      newTypeMap[typeName] = cloneType(originalTypeMap[typeName]);
    }
  });

  healTypes(newTypeMap, newDirectives);

  const query = schema.getQueryType();
  const mutation = schema.getMutationType();
  const subscription = schema.getSubscriptionType();

  return new GraphQLSchema({
    ...schema.toConfig(),
    query: query ? newTypeMap[query.name] : undefined,
    mutation: mutation ? newTypeMap[mutation.name] : undefined,
    subscription: subscription ? newTypeMap[subscription.name] : undefined,
    types: Object.keys(newTypeMap).map(typeName => newTypeMap[typeName]),
    directives: newDirectives,
  });
}
