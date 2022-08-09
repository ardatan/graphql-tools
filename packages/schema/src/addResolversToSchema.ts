import {
  GraphQLEnumType,
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLFieldConfig,
  GraphQLObjectType,
  isSpecifiedScalarType,
  GraphQLFieldResolver,
  isScalarType,
  isEnumType,
  isUnionType,
  isInterfaceType,
  isObjectType,
  GraphQLField,
} from 'graphql';

import {
  IResolvers,
  IAddResolversToSchemaOptions,
  mapSchema,
  MapperKind,
  forEachDefaultValue,
  serializeInputValue,
  healSchema,
  parseInputValue,
  forEachField,
} from '@graphql-tools/utils';

import { checkForResolveTypeResolver } from './checkForResolveTypeResolver.js';
import { extendResolversFromInterfaces } from './extendResolversFromInterfaces.js';

export function addResolversToSchema({
  schema,
  resolvers: inputResolvers,
  defaultFieldResolver,
  resolverValidationOptions = {},
  inheritResolversFromInterfaces = false,
  updateResolversInPlace = false,
}: IAddResolversToSchemaOptions): GraphQLSchema {
  const { requireResolversToMatchSchema = 'error', requireResolversForResolveType } = resolverValidationOptions;

  const resolvers = inheritResolversFromInterfaces
    ? extendResolversFromInterfaces(schema, inputResolvers)
    : inputResolvers;

  for (const typeName in resolvers) {
    const resolverValue = resolvers[typeName];
    const resolverType = typeof resolverValue;

    if (resolverType !== 'object') {
      throw new Error(
        `"${typeName}" defined in resolvers, but has invalid value "${
          resolverValue as unknown as string
        }". The resolver's value must be of type object.`
      );
    }

    const type = schema.getType(typeName);

    if (type == null) {
      if (requireResolversToMatchSchema === 'ignore') {
        continue;
      }

      throw new Error(`"${typeName}" defined in resolvers, but not in schema`);
    } else if (isSpecifiedScalarType(type)) {
      // allow -- without recommending -- overriding of specified scalar types
      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          type[fieldName.substring(2)] = resolverValue[fieldName];
        } else {
          type[fieldName] = resolverValue[fieldName];
        }
      }
    } else if (isEnumType(type)) {
      const values = type.getValues();

      for (const fieldName in resolverValue) {
        if (
          !fieldName.startsWith('__') &&
          !values.some(value => value.name === fieldName) &&
          requireResolversToMatchSchema &&
          requireResolversToMatchSchema !== 'ignore'
        ) {
          throw new Error(`${type.name}.${fieldName} was defined in resolvers, but not present within ${type.name}`);
        }
      }
    } else if (isUnionType(type)) {
      for (const fieldName in resolverValue) {
        if (
          !fieldName.startsWith('__') &&
          requireResolversToMatchSchema &&
          requireResolversToMatchSchema !== 'ignore'
        ) {
          throw new Error(
            `${type.name}.${fieldName} was defined in resolvers, but ${type.name} is not an object or interface type`
          );
        }
      }
    } else if (isObjectType(type) || isInterfaceType(type)) {
      for (const fieldName in resolverValue) {
        if (!fieldName.startsWith('__')) {
          const fields = type.getFields();
          const field = fields[fieldName];

          if (field == null) {
            // Field present in resolver but not in schema
            if (requireResolversToMatchSchema && requireResolversToMatchSchema !== 'ignore') {
              throw new Error(`${typeName}.${fieldName} defined in resolvers, but not in schema`);
            }
          } else {
            // Field present in both the resolver and schema
            const fieldResolve = resolverValue[fieldName];
            if (typeof fieldResolve !== 'function' && typeof fieldResolve !== 'object') {
              throw new Error(`Resolver ${typeName}.${fieldName} must be object or function`);
            }
          }
        }
      }
    }
  }

  schema = updateResolversInPlace
    ? addResolversToExistingSchema(schema, resolvers, defaultFieldResolver)
    : createNewSchemaWithResolvers(schema, resolvers, defaultFieldResolver);

  if (requireResolversForResolveType && requireResolversForResolveType !== 'ignore') {
    checkForResolveTypeResolver(schema, requireResolversForResolveType);
  }

  return schema;
}

function addResolversToExistingSchema(
  schema: GraphQLSchema,
  resolvers: IResolvers,
  defaultFieldResolver?: GraphQLFieldResolver<any, any>
): GraphQLSchema {
  const typeMap = schema.getTypeMap();
  for (const typeName in resolvers) {
    const type = schema.getType(typeName);
    const resolverValue = resolvers[typeName];

    if (isScalarType(type)) {
      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          type[fieldName.substring(2)] = resolverValue[fieldName];
        } else if (fieldName === 'astNode' && type.astNode != null) {
          type.astNode = {
            ...type.astNode,
            description: (resolverValue as GraphQLScalarType)?.astNode?.description ?? type.astNode.description,
            directives: (type.astNode.directives ?? []).concat(
              (resolverValue as GraphQLScalarType)?.astNode?.directives ?? []
            ),
          };
        } else if (fieldName === 'extensionASTNodes' && type.extensionASTNodes != null) {
          type.extensionASTNodes = type.extensionASTNodes.concat(
            (resolverValue as GraphQLScalarType)?.extensionASTNodes ?? []
          );
        } else if (
          fieldName === 'extensions' &&
          type.extensions != null &&
          (resolverValue as GraphQLScalarType).extensions != null
        ) {
          type.extensions = Object.assign(
            Object.create(null),
            type.extensions,
            (resolverValue as GraphQLScalarType).extensions
          );
        } else {
          type[fieldName] = resolverValue[fieldName];
        }
      }
    } else if (isEnumType(type)) {
      const config = type.toConfig();
      const enumValueConfigMap = config.values;

      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          config[fieldName.substring(2)] = resolverValue[fieldName];
        } else if (fieldName === 'astNode' && config.astNode != null) {
          config.astNode = {
            ...config.astNode,
            description: (resolverValue as GraphQLScalarType)?.astNode?.description ?? config.astNode.description,
            directives: (config.astNode.directives ?? []).concat(
              (resolverValue as GraphQLEnumType)?.astNode?.directives ?? []
            ),
          };
        } else if (fieldName === 'extensionASTNodes' && config.extensionASTNodes != null) {
          config.extensionASTNodes = config.extensionASTNodes.concat(
            (resolverValue as GraphQLEnumType)?.extensionASTNodes ?? []
          );
        } else if (
          fieldName === 'extensions' &&
          type.extensions != null &&
          (resolverValue as GraphQLEnumType).extensions != null
        ) {
          type.extensions = Object.assign(
            Object.create(null),
            type.extensions,
            (resolverValue as GraphQLEnumType).extensions
          );
        } else if (enumValueConfigMap[fieldName]) {
          enumValueConfigMap[fieldName].value = resolverValue[fieldName];
        }
      }

      typeMap[typeName] = new GraphQLEnumType(config);
    } else if (isUnionType(type)) {
      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          type[fieldName.substring(2)] = resolverValue[fieldName];
        }
      }
    } else if (isObjectType(type) || isInterfaceType(type)) {
      for (const fieldName in resolverValue) {
        if (fieldName.startsWith('__')) {
          // this is for isTypeOf and resolveType and all the other stuff.
          type[fieldName.substring(2)] = resolverValue[fieldName];
          continue;
        }

        const fields = type.getFields();
        const field = fields[fieldName];

        if (field != null) {
          const fieldResolve = resolverValue[fieldName];
          if (typeof fieldResolve === 'function') {
            // for convenience. Allows shorter syntax in resolver definition file
            field.resolve = fieldResolve.bind(resolverValue);
          } else {
            setFieldProperties(field, fieldResolve);
          }
        }
      }
    }
  }

  // serialize all default values prior to healing fields with new scalar/enum types.
  forEachDefaultValue(schema, serializeInputValue);
  // schema may have new scalar/enum types that require healing
  healSchema(schema);
  // reparse all default values with new parsing functions.
  forEachDefaultValue(schema, parseInputValue);

  if (defaultFieldResolver != null) {
    forEachField(schema, field => {
      if (!field.resolve) {
        field.resolve = defaultFieldResolver;
      }
    });
  }

  return schema;
}

function createNewSchemaWithResolvers(
  schema: GraphQLSchema,
  resolvers: IResolvers,
  defaultFieldResolver?: GraphQLFieldResolver<any, any>
): GraphQLSchema {
  schema = mapSchema(schema, {
    [MapperKind.SCALAR_TYPE]: type => {
      const config = type.toConfig();
      const resolverValue = resolvers[type.name];
      if (!isSpecifiedScalarType(type) && resolverValue != null) {
        for (const fieldName in resolverValue) {
          if (fieldName.startsWith('__')) {
            config[fieldName.substring(2)] = resolverValue[fieldName];
          } else if (fieldName === 'astNode' && config.astNode != null) {
            config.astNode = {
              ...config.astNode,
              description: (resolverValue as GraphQLScalarType)?.astNode?.description ?? config.astNode.description,
              directives: (config.astNode.directives ?? []).concat(
                (resolverValue as GraphQLScalarType)?.astNode?.directives ?? []
              ),
            };
          } else if (fieldName === 'extensionASTNodes' && config.extensionASTNodes != null) {
            config.extensionASTNodes = config.extensionASTNodes.concat(
              (resolverValue as GraphQLScalarType)?.extensionASTNodes ?? []
            );
          } else if (
            fieldName === 'extensions' &&
            config.extensions != null &&
            (resolverValue as GraphQLScalarType).extensions != null
          ) {
            config.extensions = Object.assign(
              Object.create(null),
              type.extensions,
              (resolverValue as GraphQLScalarType).extensions
            );
          } else {
            config[fieldName] = resolverValue[fieldName];
          }
        }

        return new GraphQLScalarType(config);
      }
    },
    [MapperKind.ENUM_TYPE]: type => {
      const resolverValue = resolvers[type.name];

      const config = type.toConfig();
      const enumValueConfigMap = config.values;

      if (resolverValue != null) {
        for (const fieldName in resolverValue) {
          if (fieldName.startsWith('__')) {
            config[fieldName.substring(2)] = resolverValue[fieldName];
          } else if (fieldName === 'astNode' && config.astNode != null) {
            config.astNode = {
              ...config.astNode,
              description: (resolverValue as GraphQLScalarType)?.astNode?.description ?? config.astNode.description,
              directives: (config.astNode.directives ?? []).concat(
                (resolverValue as GraphQLEnumType)?.astNode?.directives ?? []
              ),
            };
          } else if (fieldName === 'extensionASTNodes' && config.extensionASTNodes != null) {
            config.extensionASTNodes = config.extensionASTNodes.concat(
              (resolverValue as GraphQLEnumType)?.extensionASTNodes ?? []
            );
          } else if (
            fieldName === 'extensions' &&
            config.extensions != null &&
            (resolverValue as GraphQLEnumType).extensions != null
          ) {
            config.extensions = Object.assign(
              Object.create(null),
              type.extensions,
              (resolverValue as GraphQLEnumType).extensions
            );
          } else if (enumValueConfigMap[fieldName]) {
            enumValueConfigMap[fieldName].value = resolverValue[fieldName];
          }
        }

        return new GraphQLEnumType(config);
      }
    },
    [MapperKind.UNION_TYPE]: type => {
      const resolverValue = resolvers[type.name];

      if (resolverValue != null) {
        const config = type.toConfig();

        if (resolverValue['__resolveType']) {
          config.resolveType = resolverValue['__resolveType'];
        }

        return new GraphQLUnionType(config);
      }
    },
    [MapperKind.OBJECT_TYPE]: type => {
      const resolverValue = resolvers[type.name];
      if (resolverValue != null) {
        const config = type.toConfig();

        if (resolverValue['__isTypeOf']) {
          config.isTypeOf = resolverValue['__isTypeOf'];
        }

        return new GraphQLObjectType(config);
      }
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      const resolverValue = resolvers[type.name];
      if (resolverValue != null) {
        const config = type.toConfig();

        if (resolverValue['__resolveType']) {
          config.resolveType = resolverValue['__resolveType'];
        }

        return new GraphQLInterfaceType(config);
      }
    },
    [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName, typeName) => {
      const resolverValue = resolvers[typeName];

      if (resolverValue != null) {
        const fieldResolve = resolverValue[fieldName];
        if (fieldResolve != null) {
          const newFieldConfig = { ...fieldConfig };
          if (typeof fieldResolve === 'function') {
            // for convenience. Allows shorter syntax in resolver definition file
            newFieldConfig.resolve = fieldResolve.bind(resolverValue);
          } else {
            setFieldProperties(newFieldConfig, fieldResolve);
          }
          return newFieldConfig;
        }
      }
    },
  });

  if (defaultFieldResolver != null) {
    schema = mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: fieldConfig => ({
        ...fieldConfig,
        resolve: fieldConfig.resolve != null ? fieldConfig.resolve : defaultFieldResolver,
      }),
    });
  }

  return schema;
}

function setFieldProperties(
  field: GraphQLField<any, any> | GraphQLFieldConfig<any, any>,
  propertiesObj: Record<string, any>
) {
  for (const propertyName in propertiesObj) {
    field[propertyName] = propertiesObj[propertyName];
  }
}
