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
  isSpecifiedScalarType,
} from 'graphql';


import { graphqlVersion } from './graphqlVersion';
import { mapSchema } from './map';

export function cloneDirective(directive: GraphQLDirective): GraphQLDirective {
  return new GraphQLDirective(directive.toConfig());
}

export function cloneType(type: GraphQLNamedType): GraphQLNamedType {
  if (isObjectType(type)) {
    const config = type.toConfig();
    return new GraphQLObjectType({
      ...config,
      interfaces:
        typeof config.interfaces === 'function'
          ? config.interfaces
          : config.interfaces.slice(),
    });
  } else if (isInterfaceType(type)) {
    const config = type.toConfig();
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
    const config = type.toConfig();
    return new GraphQLUnionType({
      ...config,
      types: config.types.slice(),
    });
  } else if (isInputObjectType(type)) {
    return new GraphQLInputObjectType(type.toConfig());
  } else if (isEnumType(type)) {
    return new GraphQLEnumType(type.toConfig());
  } else if (isScalarType(type)) {
    return isSpecifiedScalarType(type)
      ? type
      : new GraphQLScalarType(type.toConfig());
  }

  throw new Error(`Invalid type ${type as string}`);
}

export function cloneSchema(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema);
}
