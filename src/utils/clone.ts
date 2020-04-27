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
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  isEnumType,
  isScalarType,
  GraphQLObjectTypeConfig,
  isSpecifiedDirective,
} from 'graphql';

import { isSpecifiedScalarType } from '../polyfills/isSpecifiedScalarType';
import { toConfig } from '../polyfills/toConfig';

import { graphqlVersion } from './graphqlVersion';
import { mapSchema } from './map';

export function cloneDirective(directive: GraphQLDirective): GraphQLDirective {
  return isSpecifiedDirective(directive)
    ? directive
    : new GraphQLDirective(toConfig(directive));
}

export function cloneType(type: GraphQLNamedType): GraphQLNamedType {
  if (isObjectType(type)) {
    const config = toConfig(type);
    return new GraphQLObjectType({
      ...config,
      interfaces:
        typeof config.interfaces === 'function'
          ? config.interfaces
          : config.interfaces.slice(),
    });
  } else if (isInterfaceType(type)) {
    const config = toConfig(type);
    const newConfig = {
      ...config,
      interfaces:
        graphqlVersion() >= 15
          ? typeof ((config as unknown) as GraphQLObjectTypeConfig<any, any>)
              .interfaces === 'function'
            ? ((config as unknown) as GraphQLObjectTypeConfig<any, any>)
                .interfaces
            : ((config as unknown) as {
                interfaces: Array<GraphQLInterfaceType>;
              }).interfaces.slice()
          : undefined,
    };
    return new GraphQLInterfaceType(newConfig);
  } else if (isUnionType(type)) {
    const config = toConfig(type);
    return new GraphQLUnionType({
      ...config,
      types: config.types.slice(),
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
  return mapSchema(schema);
}
