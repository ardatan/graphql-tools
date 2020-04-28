import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLFieldResolver,
} from 'graphql';

import { Transform, SubschemaConfig, isSubschemaConfig, MapperKind } from '../Interfaces';

import { defaultMergedResolver } from '../delegate';
import { mapSchema } from '../utils';
import { applySchemaTransforms } from '../utils/transforms';

import { generateProxyingResolvers } from './generateProxyingResolvers';

export function wrapSchema(
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
  transforms?: Array<Transform>
): GraphQLSchema {
  const subschemaConfig: SubschemaConfig = isSubschemaConfig(subschemaOrSubschemaConfig)
    ? subschemaOrSubschemaConfig
    : { schema: subschemaOrSubschemaConfig };

  const proxyingResolvers = generateProxyingResolvers({
    subschemaConfig,
    transforms,
  });

  const schema = createWrappingSchema(subschemaConfig.schema, proxyingResolvers);

  let schemaTransforms: Array<Transform> = [];
  if (subschemaConfig.transforms != null) {
    schemaTransforms = schemaTransforms.concat(subschemaConfig.transforms);
  }
  if (transforms != null) {
    schemaTransforms = schemaTransforms.concat(transforms);
  }

  return applySchemaTransforms(schema, schemaTransforms);
}

function createWrappingSchema(
  schema: GraphQLSchema,
  proxyingResolvers: Record<string, Record<string, GraphQLFieldResolver<any, any>>>
) {
  return mapSchema(schema, {
    [MapperKind.ROOT_OBJECT]: type => {
      const config = type.toConfig();

      Object.keys(config.fields).forEach(fieldName => {
        config.fields[fieldName] = {
          ...config.fields[fieldName],
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
