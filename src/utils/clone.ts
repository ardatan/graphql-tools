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
  isSpecifiedScalarType,
} from 'graphql';

import { mapSchema } from './map';
import { toConfig } from './toConfig';

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
          : config.interfaces.slice(),
    });
  } else if (isInterfaceType(type)) {
    const config = toConfig(type) as any;
    const newConfig = {
      ...config,
      interfaces: [
        ...((typeof config.interfaces === 'function'
          ? config.interfaces()
          : config.interfaces) || []),
      ],
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
