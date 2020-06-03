import { GraphQLSchema } from 'graphql';

import { Transform, applySchemaTransforms } from '@graphql-tools/utils';

import { SubschemaConfig, MergedTypeConfig, CreateProxyingResolverFn, Subscriber, Executor } from './types';

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
