import { GraphQLSchema } from 'graphql';

import { SubschemaConfig, Transform, MergedTypeConfig, CreateProxyingResolverFn, Subscriber, Executor } from './types';

import { FIELD_SUBSCHEMA_MAP_SYMBOL, OBJECT_SUBSCHEMA_SYMBOL } from './symbols';
import { applySchemaTransforms } from './applySchemaTransforms';

export function getSubschema(result: any, responseKey: string): GraphQLSchema | SubschemaConfig {
  const subschema = result[FIELD_SUBSCHEMA_MAP_SYMBOL] && result[FIELD_SUBSCHEMA_MAP_SYMBOL][responseKey];
  return subschema || result[OBJECT_SUBSCHEMA_SYMBOL];
}

export function setObjectSubschema(result: any, subschema: GraphQLSchema | SubschemaConfig) {
  result[OBJECT_SUBSCHEMA_SYMBOL] = subschema;
}

export function isSubschemaConfig(value: any): value is SubschemaConfig | Subschema {
  return Boolean((value as SubschemaConfig).schema);
}

export function isSubschema(value: any): value is Subschema {
  return Boolean((value as Subschema).transformedSchema);
}

export class Subschema {
  public schema: GraphQLSchema;
  public rootValue?: Record<string, any>;
  public executor?: Executor;
  public subscriber?: Subscriber;
  public createProxyingResolver?: CreateProxyingResolverFn;
  public transforms: Array<Transform>;
  public transformedSchema: GraphQLSchema;
  public merge?: Record<string, MergedTypeConfig>;

  constructor(config: SubschemaConfig) {
    this.schema = config.schema;
    this.executor = config.executor;
    this.subscriber = config.subscriber;
    this.createProxyingResolver = config.createProxyingResolver;
    this.transforms = config.transforms ?? [];
    this.merge = config.merge;

    this.transformedSchema = applySchemaTransforms(this.schema, this.transforms);
  }
}
