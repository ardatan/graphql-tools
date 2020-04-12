import {
  GraphQLField,
  GraphQLEnumType,
  GraphQLSchema,
  isSchema,
  isScalarType,
  isEnumType,
  isUnionType,
  isInterfaceType,
  isObjectType,
} from 'graphql';

import {
  IResolvers,
  IResolverValidationOptions,
  IAddResolversToSchemaOptions,
} from '../Interfaces';
import { healSchema, forEachField, forEachDefaultValue } from '../utils/index';
import {
  parseInputValue,
  serializeInputValue,
} from '../utils/transformInputValue';
import { toConfig } from '../polyfills/index';
import keyValMap from '../esUtils/keyValMap';

import SchemaError from './SchemaError';
import checkForResolveTypeResolver from './checkForResolveTypeResolver';
import extendResolversFromInterfaces from './extendResolversFromInterfaces';

function addResolversToSchema(
  schemaOrOptions: GraphQLSchema | IAddResolversToSchemaOptions,
  legacyInputResolvers?: IResolvers,
  legacyInputValidationOptions?: IResolverValidationOptions,
): GraphQLSchema {
  const options: IAddResolversToSchemaOptions = isSchema(schemaOrOptions)
    ? {
        schema: schemaOrOptions,
        resolvers: legacyInputResolvers,
        resolverValidationOptions: legacyInputValidationOptions,
      }
    : schemaOrOptions;

  const {
    schema,
    resolvers: inputResolvers,
    defaultFieldResolver,
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

  const typeMap = schema.getTypeMap();

  Object.keys(resolvers).forEach((typeName) => {
    const resolverValue = resolvers[typeName];
    const resolverType = typeof resolverValue;

    if (resolverType !== 'object' && resolverType !== 'function') {
      throw new SchemaError(
        `"${typeName}" defined in resolvers, but has invalid value "${
          resolverValue as string
        }". A resolver's value must be of type object or function.`,
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

    if (isScalarType(type)) {
      // Support -- without recommending -- overriding default scalar types
      Object.keys(resolverValue).forEach((fieldName) => {
        if (fieldName.startsWith('__')) {
          type[fieldName.substring(2)] = resolverValue[fieldName];
        } else {
          type[fieldName] = resolverValue[fieldName];
        }
      });
    } else if (isEnumType(type)) {
      // We've encountered an enum resolver that is being used to provide an
      // internal enum value.
      // Reference: https://www.apollographql.com/docs/graphql-tools/scalars.html#internal-values
      Object.keys(resolverValue).forEach((fieldName) => {
        if (!type.getValue(fieldName)) {
          if (allowResolversNotInSchema) {
            return;
          }
          throw new SchemaError(
            `${typeName}.${fieldName} was defined in resolvers, but enum is not in schema`,
          );
        }
      });

      const config = toConfig(type);

      const values = type.getValues();
      const newValues = keyValMap(
        values,
        (value) => value.name,
        (value) => {
          const newValue = Object.keys(resolverValue).includes(value.name)
            ? resolverValue[value.name]
            : value.name;
          return {
            value: newValue,
            deprecationReason: value.deprecationReason,
            description: value.description,
            astNode: value.astNode,
          };
        },
      );

      // healSchema called later to update all fields to new type
      typeMap[typeName] = new GraphQLEnumType({
        ...config,
        values: newValues,
      });
    } else if (isUnionType(type)) {
      Object.keys(resolverValue).forEach((fieldName) => {
        if (fieldName.startsWith('__')) {
          // this is for isTypeOf and resolveType and all the other stuff.
          type[fieldName.substring(2)] = resolverValue[fieldName];
          return;
        }
        if (allowResolversNotInSchema) {
          return;
        }

        throw new SchemaError(
          `${typeName} was defined in resolvers, but it's not an object`,
        );
      });
    } else if (isObjectType(type) || isInterfaceType(type)) {
      Object.keys(resolverValue).forEach((fieldName) => {
        if (fieldName.startsWith('__')) {
          // this is for isTypeOf and resolveType and all the other stuff.
          type[fieldName.substring(2)] = resolverValue[fieldName];
          return;
        }

        const fields = type.getFields();
        const field = fields[fieldName];

        if (field == null) {
          if (allowResolversNotInSchema) {
            return;
          }

          throw new SchemaError(
            `${typeName}.${fieldName} defined in resolvers, but not in schema`,
          );
        }

        const fieldResolve = resolverValue[fieldName];
        if (typeof fieldResolve === 'function') {
          // for convenience. Allows shorter syntax in resolver definition file
          field.resolve = fieldResolve;
        } else {
          if (typeof fieldResolve !== 'object') {
            throw new SchemaError(
              `Resolver ${typeName}.${fieldName} must be object or function`,
            );
          }
          setFieldProperties(field, fieldResolve);
        }
      });
    }
  });

  checkForResolveTypeResolver(schema, requireResolversForResolveType);

  // serialize all default values prior to healing fields with new scalar/enum types.
  forEachDefaultValue(schema, serializeInputValue);
  // schema may have new scalar/enum types that require healing
  healSchema(schema);
  // reparse all default values with new parsing functions.
  forEachDefaultValue(schema, parseInputValue);

  if (defaultFieldResolver != null) {
    forEachField(schema, (field) => {
      if (!field.resolve) {
        field.resolve = defaultFieldResolver;
      }
    });
  }

  return schema;
}

function setFieldProperties(
  field: GraphQLField<any, any>,
  propertiesObj: Record<string, any>,
) {
  Object.keys(propertiesObj).forEach((propertyName) => {
    field[propertyName] = propertiesObj[propertyName];
  });
}

export default addResolversToSchema;
