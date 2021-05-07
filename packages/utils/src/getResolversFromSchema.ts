import {
  GraphQLScalarType,
  GraphQLSchema,
  isScalarType,
  isEnumType,
  isInterfaceType,
  isUnionType,
  isObjectType,
  isSpecifiedScalarType,
} from 'graphql';

import { IResolvers } from './Interfaces';

export function getResolversFromSchema(schema: GraphQLSchema): IResolvers {
  const resolvers = Object.create({});

  const typeMap = schema.getTypeMap();

  Object.keys(typeMap).forEach(typeName => {
    if (!typeName.startsWith('_')) {
      const type = typeMap[typeName];

      if (isScalarType(type)) {
        if (!isSpecifiedScalarType(type)) {
          const config = type.toConfig();
          delete config.astNode; // avoid AST duplication elsewhere
          resolvers[typeName] = new GraphQLScalarType(config);
        }
      } else if (isEnumType(type)) {
        resolvers[typeName] = {};

        const values = type.getValues();
        values.forEach(value => {
          resolvers[typeName][value.name] = value.value;
        });
      } else if (isInterfaceType(type)) {
        if (type.resolveType != null) {
          resolvers[typeName] = {
            __resolveType: type.resolveType,
          };
        }
      } else if (isUnionType(type)) {
        if (type.resolveType != null) {
          resolvers[typeName] = {
            __resolveType: type.resolveType,
          };
        }
      } else if (isObjectType(type)) {
        resolvers[typeName] = {};

        if (type.isTypeOf != null) {
          resolvers[typeName].__isTypeOf = type.isTypeOf;
        }

        const fields = type.getFields();
        Object.keys(fields).forEach(fieldName => {
          const field = fields[fieldName];
          if (field.subscribe != null) {
            resolvers[typeName][fieldName] = resolvers[typeName][fieldName] || {};
            resolvers[typeName][fieldName].subscribe = field.subscribe;
          }
          if (field.resolve != null && field.resolve?.name !== 'defaultFieldResolver' && field.resolve?.name !== 'defaultMergedResolver') {
            resolvers[typeName][fieldName] = resolvers[typeName][fieldName] || {};
            resolvers[typeName][fieldName].resolve = field.resolve;
          }
        });
      }
    }
  });

  return resolvers;
}
