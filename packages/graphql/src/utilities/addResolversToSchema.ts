// TODO: Add tests for me.

import {
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldConfig,
  isEnumType,
  isInterfaceType,
  GraphQLScalarType,
  GraphQLSchema,
  isObjectType,
  isScalarType,
  isUnionType,
} from '../type';

function setFieldProperties(
  field: GraphQLField<any, any> | GraphQLFieldConfig<any, any>,
  propertiesObj: Record<string, any>
) {
  for (const propertyName in propertiesObj) {
    field[propertyName] = propertiesObj[propertyName];
  }
}

export function addResolversToExistingSchema(schema: GraphQLSchema, resolvers: any) {
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

      Object.assign(typeMap[typeName], new GraphQLEnumType(config));
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
}
