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
import { applySchemaTransforms } from '../transforms/transforms';
import { checkForResolveTypeResolver, extendResolversFromInterfaces } from '.';
import AddEnumAndScalarResolvers from '../transforms/AddEnumAndScalarResolvers';

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

  // Used to map the external value of an enum to its internal value, when
  // that internal value is provided by a resolver.
  const enumValueMap = Object.create(null);
  // Used to store custom scalar implementations.
  const scalarTypeMap = Object.create(null);

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
      scalarTypeMap[type.name] = resolverValue;
    } else if (type instanceof GraphQLEnumType) {
      Object.keys(resolverValue).forEach(fieldName => {
        if (!type.getValue(fieldName)) {
          if (allowResolversNotInSchema) {
            return;
          }
          throw new SchemaError(
            `${typeName}.${fieldName} was defined in resolvers, but enum is not in schema`,
          );
        }

        // We've encountered an enum resolver that is being used to provide an
        // internal enum value.
        // Reference: https://www.apollographql.com/docs/graphql-tools/scalars.html#internal-values
        //
        // We're storing a map of the current enums external facing value to
        // its resolver provided internal value. This map is used to transform
        // the current schema to a new schema that includes enums with the new
        // internal value.
        enumValueMap[type.name] = enumValueMap[type.name] || {};
        enumValueMap[type.name][fieldName] = resolverValue[fieldName];
      });
    } else {
      // object type
      Object.keys(resolverValue).forEach(fieldName => {
        if (fieldName.startsWith('__')) {
          // this is for isTypeOf and resolveType and all the other stuff.
          type[fieldName.substring(2)] = resolverValue[fieldName];
          return;
        }

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
    }
  });

  checkForResolveTypeResolver(schema, requireResolversForResolveType);

  // If there are any enum resolver functions (that are used to return
  // internal enum values), create a new schema that includes enums with the
  // new internal facing values.
  // also parse all defaultValues in all input fields to use internal values for enums/scalars
  const updatedSchema = applySchemaTransforms(schema, [
    new AddEnumAndScalarResolvers(enumValueMap, scalarTypeMap),
  ]);

  return updatedSchema;
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
