import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLFieldResolver,
} from 'graphql';

import { MapperKind, mapSchema } from '@graphql-tools/utils';

import {
  SubschemaConfig,
  Transform,
  isSubschemaConfig,
  defaultMergedResolver,
  applySchemaTransforms,
} from '@graphql-tools/delegate';
import { generateProxyingResolvers } from './generateProxyingResolvers';

export function wrapSchema(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms?: Array<Transform>
): GraphQLSchema {
  let targetSchema: GraphQLSchema;
  let subschemaConfig: SubschemaConfig;

  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    targetSchema = subschemaOrSubschemaConfig.schema;
    subschemaConfig = subschemaOrSubschemaConfig;
  } else {
    targetSchema = subschemaOrSubschemaConfig;
  }

  const proxyingResolvers = generateProxyingResolvers(subschemaOrSubschemaConfig, transforms);
  const schema = createWrappingSchema(targetSchema, proxyingResolvers);

  const transformedSchema = applySchemaTransforms(schema, subschemaConfig, transforms);

  return applySchemaTransforms(schema, subschemaConfig, transforms, transformedSchema);
}

function createWrappingSchema(
  schema: GraphQLSchema,
  proxyingResolvers: Record<string, Record<string, GraphQLFieldResolver<any, any>>>
) {
  return mapSchema(schema, {
    [MapperKind.ROOT_OBJECT]: type => {
      const config = type.toConfig();

      const fieldConfigMap = config.fields;
      Object.keys(fieldConfigMap).forEach(fieldName => {
        fieldConfigMap[fieldName] = {
          ...fieldConfigMap[fieldName],
          ...proxyingResolvers[type.name][fieldName],
        };
      });

      return new GraphQLObjectType(config);
    },
    [MapperKind.OBJECT_TYPE]: type => {
      const config = type.toConfig();
      config.isTypeOf = undefined;

      Object.keys(config.fields).forEach(fieldName => {
        config.fields[fieldName].resolve = defaultMergedResolver;
        config.fields[fieldName].subscribe = null;
      });

      return new GraphQLObjectType(config);
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      const config = type.toConfig();
      delete config.resolveType;
      return new GraphQLInterfaceType(config);
    },
    [MapperKind.UNION_TYPE]: type => {
      const config = type.toConfig();
      delete config.resolveType;
      return new GraphQLUnionType(config);
    },
  });
}
