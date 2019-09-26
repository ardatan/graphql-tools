import {
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
} from 'graphql';
import { IResolvers } from '../Interfaces';
import isSpecifiedScalarType from './isSpecifiedScalarType';
import { cloneType } from './clone';

export function getResolversFromSchema(schema: GraphQLSchema): IResolvers {
  const resolvers = Object.create({});

  const typeMap = schema.getTypeMap();

  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];

    if (type instanceof GraphQLScalarType) {
      if (!isSpecifiedScalarType(type)) {
        resolvers[typeName] = cloneType(type);
      }
    } else if (type instanceof GraphQLEnumType) {
      resolvers[typeName] = {};

      const values = type.getValues();
      values.forEach(value => {
        resolvers[typeName][value.name] = value.value;
      });
    } else if (type instanceof GraphQLInterfaceType) {
      if (type.resolveType) {
        resolvers[typeName] = {
          __resolveType: type.resolveType,
        };
      }
    } else if (type instanceof GraphQLUnionType) {
      if (type.resolveType) {
        resolvers[typeName] = {
          __resolveType: type.resolveType,
        };
      }
    } else if (type instanceof GraphQLObjectType) {
      resolvers[typeName] = {};

      if (type.isTypeOf) {
        resolvers[typeName].__isTypeOf = type.isTypeOf;
      }

      const fields = type.getFields();
      Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];

        resolvers[typeName][fieldName] = {
          resolve: field.resolve,
          subscribe: field.subscribe,
        };
      });
    }
  });

  return resolvers;
}
