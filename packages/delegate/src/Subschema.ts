import { GraphQLSchema } from 'graphql';

import { Transform, applySchemaTransforms, mapSchema, MapperKind, getDirectives } from '@graphql-tools/utils';

import {
  SubschemaConfig,
  MergedTypeConfig,
  CreateProxyingResolverFn,
  Subscriber,
  Executor,
  Endpoint,
  EndpointBatchingOptions,
} from './types';

import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL } from './symbols';

export function getSubschema(result: any, responseKey: string): GraphQLSchema | SubschemaConfig {
  const subschema = result[FIELD_SUBSCHEMA_MAP_SYMBOL] && result[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey];
  return subschema || result[OBJECT_SUBSCHEMA_SYMBOL];
}

export function setObjectSubschema(result: any, subschema: GraphQLSchema | SubschemaConfig) {
  result[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
}

export function isSubschemaConfig(value: any): value is SubschemaConfig | Subschema {
  return Boolean(value.schema && value.permutations === undefined);
}
export function isSubschema(value: any): value is Subschema {
  return Boolean(value.transformedSchema);
}

export class Subschema<K = any, V = any, C = K> {
  public schema: GraphQLSchema;

  public rootValue?: Record<string, any>;
  public executor?: Executor;
  public subscriber?: Subscriber;
  public batch?: boolean;
  public batchingOptions?: EndpointBatchingOptions<K, V, C>;
  public endpoint?: Endpoint;

  public createProxyingResolver?: CreateProxyingResolverFn;
  public transforms: Array<Transform>;
  public transformedSchema: GraphQLSchema;

  public merge?: Record<string, MergedTypeConfig>;
  public requiresDirectiveName: string;

  constructor(config: SubschemaConfig) {
    this.schema = config.schema;

    this.rootValue = config.rootValue;
    this.executor = config.executor;
    this.subscriber = config.subscriber;
    this.batch = config.batch;
    this.batchingOptions = config.batchingOptions;
    this.endpoint = config.endpoint;

    this.createProxyingResolver = config.createProxyingResolver;
    this.transforms = config.transforms ?? [];
    this.transformedSchema = applySchemaTransforms(this.schema, this.transforms);

    this.merge = config.merge ?? {};
    this.requiresDirectiveName = config.requiresDirectiveName ?? 'requires';

    this.schema = mapSchema(this.schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
        const mergeTypeConfig = this.merge[typeName];

        if (mergeTypeConfig == null) {
          return undefined;
        }

        const requires = getDirectives(schema, fieldConfig)[this.requiresDirectiveName];

        if (requires == null) {
          return undefined;
        }

        const selectionSet = requires.fields != null ? `{ ${requires.fields} }` : requires.selectionSet;

        if (selectionSet == null) {
          return undefined;
        }

        mergeTypeConfig.fields = mergeTypeConfig.fields ?? {};
        mergeTypeConfig.fields[fieldName] = mergeTypeConfig.fields[fieldName] ?? {};

        const mergeFieldConfig = mergeTypeConfig.fields[fieldName];
        mergeFieldConfig.selectionSet = mergeFieldConfig.selectionSet ?? selectionSet;

        return undefined;
      },
    });
  }
}
