import {
  GraphQLField,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
} from 'graphql';

import {
  IResolvers,
  IResolverValidationOptions,
  IAddResolveFunctionsToSchemaOptions,
} from '../Interfaces';

import SchemaError from './SchemaError';
import checkForResolveTypeResolver from './checkForResolveTypeResolver';
import extendResolversFromInterfaces from './extendResolversFromInterfaces';
import {
  parseInputValue,
  serializeInputValue,
  healSchema,
  forEachField,
  forEachDefaultValue,
} from '../utils';

function addResolversToSchema(
  options: IAddResolveFunctionsToSchemaOptions | GraphQLSchema,
  legacyInputResolvers?: IResolvers,
  legacyInputValidationOptions?: IResolverValidationOptions,
) {
  if (options instanceof GraphQLSchema) {
    console.warn(
      'The addResolversToSchema function takes named options now; see IAddResolveFunctionsToSchemaOptions',
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

    if (type instanceof GraphQLScalarType) {
      const config = type.toConfig();

      Object.keys(resolverValue).forEach(fieldName => {
        // Below is necessary as legacy code for scalar type specification allowed
        // hardcoding within the resolver an object with fields '__serialize',
        // '__parse', and '__parseLiteral', see examples in testMocking.ts.
        // Luckily, the fields on GraphQLScalarType and GraphQLScalarTypeConfig
        // are named the same.
        if (fieldName.startsWith('__')) {
          config[fieldName.substring(2)] = resolverValue[fieldName];
        } else {
          config[fieldName] = resolverValue[fieldName];
        }
      });

      // healSchema called later to update all fields to new type
      typeMap[type.name] = new GraphQLScalarType(config);
    } else if (type instanceof GraphQLEnumType) {
      // We've encountered an enum resolver that is being used to provide an
      // internal enum value.
      // Reference: https://www.apollographql.com/docs/graphql-tools/scalars.html#internal-values
      Object.keys(resolverValue).forEach(fieldName => {
        if (!type.getValue(fieldName)) {
          if (allowResolversNotInSchema) {
            return;
          }
          throw new SchemaError(
            `${typeName}.${fieldName} was defined in resolvers, but enum is not in schema`,
          );
        }
      });

      const config = type.toConfig();

      const values = type.getValues();
      const newValues = {};
      values.forEach(value => {
        const newValue = Object.keys(resolverValue).includes(
          value.name,
        )
          ? resolverValue[value.name]
          : value.name;
        newValues[value.name] = {
          value: newValue,
          deprecationReason: value.deprecationReason,
          description: value.description,
          astNode: value.astNode,
        };
      });

      // healSchema called later to update all fields to new type
      typeMap[type.name] = new GraphQLEnumType({
        ...config,
        values: newValues,
      });
    } else {
      // object type
      Object.keys(resolverValue).forEach(fieldName => {
        if (fieldName.startsWith('__')) {
          // this is for isTypeOf and resolveType and all the other stuff.
          type[fieldName.substring(2)] = resolverValue[fieldName];
          return;
        }

        if (!(
          type instanceof GraphQLObjectType ||
          type instanceof GraphQLInterfaceType
        )) {
          if (allowResolversNotInSchema) {
            return;
          }

          throw new SchemaError(
            `${typeName} was defined in resolvers, but it's not an object`,
          );
        }

        const fields = type.getFields();
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

  if (defaultFieldResolver) {
    forEachField(schema, field => {
      if (!field.resolve) {
        field.resolve = defaultFieldResolver;
      }
    });
  }

  return schema;
}

function setFieldProperties(
  field: GraphQLField<any, any>,
  propertiesObj: Object,
) {
  Object.keys(propertiesObj).forEach(propertyName => {
    field[propertyName] = propertiesObj[propertyName];
  });
}

export default addResolversToSchema;
