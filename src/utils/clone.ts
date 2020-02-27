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
  GraphQLInterfaceTypeConfig,
} from 'graphql';

import { healTypes } from './heal';
import isSpecifiedScalarType from './isSpecifiedScalarType';
import { directiveToConfig, typeToConfig, schemaToConfig } from './toConfig';
import { graphqlVersion } from './graphqlVersion';

export function cloneDirective(directive: GraphQLDirective): GraphQLDirective {
  return new GraphQLDirective(directiveToConfig(directive));
}

export function cloneType(type: GraphQLNamedType): GraphQLNamedType {
  if (type instanceof GraphQLObjectType) {
    const config = typeToConfig(type);
    return new GraphQLObjectType({
      ...config,
      interfaces:
        typeof config.interfaces === 'function'
          ? config.interfaces
          : (config.interfaces as ReadonlyArray<GraphQLInterfaceType>).slice(),
    });
  } else if (type instanceof GraphQLInterfaceType) {
    const config = typeToConfig((type as unknown) as GraphQLObjectType);
    const newConfig = {
      ...config,
      interfaces:
        graphqlVersion() >= 15
          ? (config.interfaces as ReadonlyArray<GraphQLInterfaceType>).slice()
          : undefined,
    };
    return new GraphQLInterfaceType(
      (newConfig as unknown) as GraphQLInterfaceTypeConfig<any, any>,
    );
  } else if (type instanceof GraphQLUnionType) {
    const config = typeToConfig(type);
    return new GraphQLUnionType({
      ...config,
      types: (config.types as ReadonlyArray<GraphQLObjectType>).slice(),
    });
  } else if (type instanceof GraphQLInputObjectType) {
    return new GraphQLInputObjectType(typeToConfig(type));
  } else if (type instanceof GraphQLEnumType) {
    return new GraphQLEnumType(typeToConfig(type));
  } else if (type instanceof GraphQLScalarType) {
    return isSpecifiedScalarType(type)
      ? type
      : new GraphQLScalarType(typeToConfig(type));
  }

  throw new Error(`Invalid type ${type as string}`);
}

export function cloneSchema(schema: GraphQLSchema): GraphQLSchema {
  const newDirectives = schema
    .getDirectives()
    .map(directive => cloneDirective(directive));

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
    ...schemaToConfig(schema),
    query: query != null ? newTypeMap[query.name] : undefined,
    mutation: mutation != null ? newTypeMap[mutation.name] : undefined,
    subscription:
      subscription != null ? newTypeMap[subscription.name] : undefined,
    types: Object.keys(newTypeMap).map(typeName => newTypeMap[typeName]),
    directives: newDirectives,
  });
}
