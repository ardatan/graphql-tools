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
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  isEnumType,
  isScalarType,
} from 'graphql';

import { isSpecifiedScalarType, toConfig } from '../polyfills';

import { healTypes } from './heal';
import { graphqlVersion } from './graphqlVersion';

export function cloneDirective(directive: GraphQLDirective): GraphQLDirective {
  return new GraphQLDirective(toConfig(directive));
}

export function cloneType(type: GraphQLNamedType): GraphQLNamedType {
  if (isObjectType(type)) {
    const config = toConfig(type);
    return new GraphQLObjectType({
      ...config,
      interfaces:
        typeof config.interfaces === 'function'
          ? config.interfaces
          : (config.interfaces as ReadonlyArray<GraphQLInterfaceType>).slice(),
    });
  } else if (isInterfaceType(type)) {
    const config = toConfig((type as unknown) as GraphQLObjectType);
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
  } else if (isUnionType(type)) {
    const config = toConfig(type);
    return new GraphQLUnionType({
      ...config,
      types: (config.types as ReadonlyArray<GraphQLObjectType>).slice(),
    });
  } else if (isInputObjectType(type)) {
    return new GraphQLInputObjectType(toConfig(type));
  } else if (isEnumType(type)) {
    return new GraphQLEnumType(toConfig(type));
  } else if (isScalarType(type)) {
    return isSpecifiedScalarType(type)
      ? type
      : new GraphQLScalarType(toConfig(type));
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
    ...toConfig(schema),
    query: query != null ? newTypeMap[query.name] : undefined,
    mutation: mutation != null ? newTypeMap[mutation.name] : undefined,
    subscription:
      subscription != null ? newTypeMap[subscription.name] : undefined,
    types: Object.keys(newTypeMap).map(typeName => newTypeMap[typeName]),
    directives: newDirectives,
  });
}
