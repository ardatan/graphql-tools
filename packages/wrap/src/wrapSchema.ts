import {
  GraphQLFieldResolver,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLUnionType,
  isSpecifiedScalarType,
} from 'graphql';
import {
  applySchemaTransforms,
  defaultMergedResolver,
  Subschema,
  SubschemaConfig,
} from '@graphql-tools/delegate';
import { MapperKind, mapSchema, memoize1 } from '@graphql-tools/utils';
import { addDirectiveExtensions } from './directiveExtensions.js';
import { generateProxyingResolvers } from './generateProxyingResolvers.js';

export const wrapSchema = memoize1(function wrapSchema<
  TConfig extends Record<string, any> = Record<string, any>,
>(
  subschemaConfig: SubschemaConfig<any, any, any, TConfig> | Subschema<any, any, any, TConfig>,
): GraphQLSchema {
  const targetSchema = subschemaConfig.schema;

  const proxyingResolvers = generateProxyingResolvers(subschemaConfig);
  const schema = createWrappingSchema(targetSchema, proxyingResolvers, subschemaConfig.name);
  const transformed = applySchemaTransforms(schema, subschemaConfig);
  return transformed;
});

function createWrappingSchema(
  schema: GraphQLSchema,
  proxyingResolvers: Record<string, Record<string, GraphQLFieldResolver<any, any>>>,
  subschemaName?: string,
) {
  return mapSchema(schema, {
    [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const newFieldConfig = {
        ...fieldConfig,
        ...proxyingResolvers[typeName]?.[fieldName],
      };
      if (subschemaName) {
        addDirectiveExtensions(newFieldConfig, {
          subschemaRootField: {
            subschema: subschemaName,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return newFieldConfig;
    },
    [MapperKind.OBJECT_TYPE]: type => {
      const config = type.toConfig();
      const newConfig = {
        ...config,
        isTypeOf: undefined,
      };
      if (subschemaName) {
        const interfaces = type.getInterfaces();
        addDirectiveExtensions(newConfig, {
          subschemaObjectType: {
            subschema: subschemaName,
            type: type.name,
            implements: interfaces?.length > 0 ? interfaces.map(i => i.name) : undefined,
          },
        });
      }
      return new GraphQLObjectType(newConfig);
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const newFieldConfig = {
        ...fieldConfig,
        resolve: defaultMergedResolver,
        subscribe: undefined,
      };
      if (subschemaName) {
        addDirectiveExtensions(newFieldConfig, {
          subschemaObjectField: {
            subschema: subschemaName,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return newFieldConfig;
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      const config = type.toConfig();
      const newConfig = {
        ...config,
        resolveType: undefined,
      };
      const interfaces = type.getInterfaces();
      if (subschemaName) {
        addDirectiveExtensions(newConfig, {
          subschemaInterfaceType: {
            subschema: subschemaName,
            type: type.name,
            implements: interfaces?.length > 0 ? interfaces.map(i => i.name) : undefined,
          },
        });
      }
      return new GraphQLInterfaceType(newConfig);
    },
    [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
      const newFieldConfig = {
        ...fieldConfig,
        resolve: defaultMergedResolver,
        subscribe: undefined,
      };
      if (subschemaName) {
        addDirectiveExtensions(newFieldConfig, {
          subschemaInterfaceField: {
            subschema: subschemaName,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return newFieldConfig;
    },
    [MapperKind.UNION_TYPE]: type => {
      const config = type.toConfig();
      const newConfig = {
        ...config,
        resolveType: undefined,
      };
      if (subschemaName) {
        addDirectiveExtensions(newConfig, {
          subschemaUnionType: {
            subschema: subschemaName,
            type: type.name,
            types: type.getTypes().map(t => t.name),
          },
        });
      }
      return new GraphQLUnionType(newConfig);
    },
    [MapperKind.SCALAR_TYPE]: type => {
      if (!isSpecifiedScalarType(type) && subschemaName) {
        addDirectiveExtensions(type, {
          subschemaScalarType: {
            subschema: subschemaName,
            type: type.name,
          },
        });
      }
      return type;
    },
    [MapperKind.ENUM_TYPE]: type => {
      if (subschemaName) {
        addDirectiveExtensions(type, {
          subschemaEnumType: {
            subschema: subschemaName,
            type: type.name,
          },
        });
      }
      return type;
    },
    [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) => {
      const newConfig = {
        ...valueConfig,
        value: undefined,
      };
      if (subschemaName) {
        addDirectiveExtensions(newConfig, {
          subschemaEnumValue: {
            subschema: subschemaName,
            type: typeName,
            value: externalValue,
          },
        });
      }
      return newConfig;
    },
    [MapperKind.ARGUMENT]: (argumentConfig, fieldName, typeName) => {
      if (subschemaName) {
        addDirectiveExtensions(argumentConfig, {
          subschemaArgument: {
            subschema: subschemaName,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return argumentConfig;
    },
    [MapperKind.INPUT_OBJECT_TYPE]: type => {
      if (subschemaName) {
        addDirectiveExtensions(type, {
          subschemaInputObjectType: {
            subschema: subschemaName,
            type: type.name,
          },
        });
      }
      return type;
    },
    [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      if (subschemaName) {
        addDirectiveExtensions(fieldConfig, {
          subschemaInputObjectField: {
            subschema: subschemaName,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return fieldConfig;
    },
  });
}
