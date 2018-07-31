import { SchemaError } from '.';

import {
  GraphQLField,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLType,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLFieldMap,
} from 'graphql';

import {
  IResolvers,
  IResolverValidationOptions,
  IAddResolveFunctionsToSchemaOptions,
} from '../Interfaces';

import { checkForResolveTypeResolver, extendResolversFromInterfaces } from '.';

function addResolveFunctionsToSchema(
  options: IAddResolveFunctionsToSchemaOptions | GraphQLSchema,
  legacyInputResolvers?: IResolvers,
  legacyInputValidationOptions?: IResolverValidationOptions,
) {
  if (options instanceof GraphQLSchema) {
    console.warn(
      'The addResolveFunctionsToSchema function takes named options now; see IAddResolveFunctionsToSchemaOptions',
    );
    options = {
      schema: options,
      resolvers: legacyInputResolvers,
      resolverValidationOptions: legacyInputValidationOptions,
    };
  }

  const {
    schema,
    resolvers: inputResolvers,
    resolverValidationOptions = {},
    inheritResolversFromInterfaces = false,
  } = options;

  const {
    allowResolversNotInSchema = false,
    requireResolversForResolveType,
  } = resolverValidationOptions;

  const resolvers = inheritResolversFromInterfaces
    ? extendResolversFromInterfaces(schema, inputResolvers)
    : inputResolvers;

  Object.keys(resolvers).forEach(typeName => {
    const resolverValue = resolvers[typeName];
    const resolverType = typeof resolverValue;

    if (resolverType !== 'object' && resolverType !== 'function') {
      throw new SchemaError(
        `"${typeName}" defined in resolvers, but has invalid value "${resolverValue}". A resolver's value ` +
        `must be of type object or function.`,
      );
    }

    const type = schema.getType(typeName);
    if (!type && typeName !== '__schema') {
      if (allowResolversNotInSchema) {
        return;
      }

      throw new SchemaError(
        `"${typeName}" defined in resolvers, but not in schema`,
      );
    }

    Object.keys(resolverValue).forEach(fieldName => {
      if (fieldName.startsWith('__')) {
        // this is for isTypeOf and resolveType and all the other stuff.
        type[fieldName.substring(2)] = resolverValue[fieldName];
        return;
      }

      if (type instanceof GraphQLScalarType) {
        type[fieldName] = resolverValue[fieldName];
        return;
      }

      if (type instanceof GraphQLEnumType) {
        if (!type.getValue(fieldName)) {
          if (allowResolversNotInSchema) {
            return;
          }
          throw new SchemaError(
            `${typeName}.${fieldName} was defined in resolvers, but enum is not in schema`,
          );
        }

        type.getValue(fieldName)['value'] = resolverValue[fieldName];
        return;
      }

      // object type
      const fields = getFieldsForType(type);
      if (!fields) {
        if (allowResolversNotInSchema) {
          return;
        }

        throw new SchemaError(
          `${typeName} was defined in resolvers, but it's not an object`,
        );
      }

      if (!fields[fieldName]) {
        if (allowResolversNotInSchema) {
          return;
        }

        throw new SchemaError(
          `${typeName}.${fieldName} defined in resolvers, but not in schema`,
        );
      }
      const field = fields[fieldName];
      const fieldResolve = resolverValue[fieldName];
      if (typeof fieldResolve === 'function') {
        // for convenience. Allows shorter syntax in resolver definition file
        setFieldProperties(field, { resolve: fieldResolve });
      } else {
        if (typeof fieldResolve !== 'object') {
          throw new SchemaError(
            `Resolver ${typeName}.${fieldName} must be object or function`,
          );
        }
        setFieldProperties(field, fieldResolve);
      }
    });
  });

  checkForResolveTypeResolver(schema, requireResolversForResolveType);
}

function getFieldsForType(type: GraphQLType): GraphQLFieldMap<any, any> {
  if (
    type instanceof GraphQLObjectType ||
    type instanceof GraphQLInterfaceType
  ) {
    return type.getFields();
  } else {
    return undefined;
  }
}

function setFieldProperties(
  field: GraphQLField<any, any>,
  propertiesObj: Object,
) {
  Object.keys(propertiesObj).forEach(propertyName => {
    field[propertyName] = propertiesObj[propertyName];
  });
}

export default addResolveFunctionsToSchema;
