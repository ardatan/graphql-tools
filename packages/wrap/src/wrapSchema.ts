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
  const proxyingResolvers = generateProxyingResolvers(subschemaConfig);
  const schema = createWrappingSchema(subschemaConfig, proxyingResolvers);
  const transformed = applySchemaTransforms(schema, subschemaConfig);
  return transformed;
});

function createWrappingSchema(
  subschemaConfig: SubschemaConfig<any, any, any, any>,
  proxyingResolvers: Record<string, Record<string, GraphQLFieldResolver<any, any>>>,
) {
  const wrappingSchema = mapSchema(subschemaConfig.schema, {
    [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const newFieldConfig = {
        ...fieldConfig,
        ...proxyingResolvers[typeName]?.[fieldName],
      };
      if (subschemaConfig.name) {
        addDirectiveExtensions(newFieldConfig, {
          subschemaObjectField: {
            subschema: subschemaConfig.name,
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
      if (subschemaConfig.name) {
        const interfaces = type.getInterfaces();
        addDirectiveExtensions(newConfig, {
          subschemaObjectType: {
            subschema: subschemaConfig.name,
            type: type.name,
            implements: interfaces?.length > 0 ? interfaces.map(i => i.name) : undefined,
          },
        });
        const typeMergingOptions = subschemaConfig.merge?.[type.name];
        if (typeMergingOptions) {
          addDirectiveExtensions(newConfig, {
            merge: {
              subschema: subschemaConfig.name,
              selectionSet: typeMergingOptions.selectionSet,
              fieldName: typeMergingOptions.fieldName,

              // batching
              key: typeMergingOptions.key?.name,
              argsFromKeys: typeMergingOptions.argsFromKeys?.name,

              // regular
              args: typeMergingOptions.args?.name,
              valuesFromResults: typeMergingOptions.valuesFromResults?.name,
              resolve: typeMergingOptions.resolve?.name,
            },
          });
        }
      }
      return new GraphQLObjectType(newConfig);
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const newFieldConfig = {
        ...fieldConfig,
        resolve: defaultMergedResolver,
        subscribe: undefined,
      };
      if (subschemaConfig.name) {
        addDirectiveExtensions(newFieldConfig, {
          subschemaObjectField: {
            subschema: subschemaConfig.name,
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
      if (subschemaConfig.name) {
        addDirectiveExtensions(newConfig, {
          subschemaInterfaceType: {
            subschema: subschemaConfig.name,
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
      if (subschemaConfig.name) {
        addDirectiveExtensions(newFieldConfig, {
          subschemaInterfaceField: {
            subschema: subschemaConfig.name,
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
      if (subschemaConfig.name) {
        addDirectiveExtensions(newConfig, {
          subschemaUnionType: {
            subschema: subschemaConfig.name,
            type: type.name,
            types: type.getTypes().map(t => t.name),
          },
        });
      }
      return new GraphQLUnionType(newConfig);
    },
    [MapperKind.SCALAR_TYPE]: type => {
      if (!isSpecifiedScalarType(type) && subschemaConfig.name) {
        addDirectiveExtensions(type, {
          subschemaScalarType: {
            subschema: subschemaConfig.name,
            type: type.name,
          },
        });
      }
      return type;
    },
    [MapperKind.ENUM_TYPE]: type => {
      if (subschemaConfig.name) {
        addDirectiveExtensions(type, {
          subschemaEnumType: {
            subschema: subschemaConfig.name,
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
      if (subschemaConfig.name) {
        addDirectiveExtensions(newConfig, {
          subschemaEnumValue: {
            subschema: subschemaConfig.name,
            type: typeName,
            value: externalValue,
          },
        });
      }
      return newConfig;
    },
    [MapperKind.ARGUMENT]: (argumentConfig, fieldName, typeName) => {
      if (subschemaConfig.name) {
        addDirectiveExtensions(argumentConfig, {
          subschemaArgument: {
            subschema: subschemaConfig.name,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return argumentConfig;
    },
    [MapperKind.INPUT_OBJECT_TYPE]: type => {
      if (subschemaConfig.name) {
        addDirectiveExtensions(type, {
          subschemaInputObjectType: {
            subschema: subschemaConfig.name,
            type: type.name,
          },
        });
      }
      return type;
    },
    [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      if (subschemaConfig.name) {
        addDirectiveExtensions(fieldConfig, {
          subschemaInputObjectField: {
            subschema: subschemaConfig.name,
            type: typeName,
            field: fieldName,
          },
        });
      }
      return fieldConfig;
    },
  });
  if (subschemaConfig.name) {
    addDirectiveExtensions(wrappingSchema, {
      subschema: {
        subschema: subschemaConfig.name,
        executor: subschemaConfig.executor?.name || 'defaultExecutor',
      },
    });
  }
  return wrappingSchema;
}
