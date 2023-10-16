import { GraphQLSchema } from 'graphql';
import { Executor } from '@graphql-tools/utils';
import { applySchemaTransforms } from './applySchemaTransforms.js';
import {
  BatchingOptions,
  CreateProxyingResolverFn,
  MergedTypeConfig,
  SubschemaConfig,
  Transform,
} from './types.js';

export function isSubschema(value: any): value is Subschema {
  return Boolean(value.transformedSchema);
}

interface ISubschema<K = any, V = any, C = K, TContext = Record<string, any>>
  extends SubschemaConfig<K, V, C, TContext> {
  transformedSchema: GraphQLSchema;
}

export class Subschema<K = any, V = any, C = K, TContext = Record<string, any>>
  implements ISubschema<K, V, C, TContext>
{
  public schema: GraphQLSchema;

  public executor?: Executor<TContext>;
  public batch?: boolean;
  public batchingOptions?: BatchingOptions<K, V, C>;

  public createProxyingResolver?: CreateProxyingResolverFn<TContext>;
  public transforms: Array<Transform<any, TContext>>;
  private _transformedSchema: GraphQLSchema | undefined;

  public merge?: Record<string, MergedTypeConfig<any, any, TContext>>;

  constructor(config: SubschemaConfig<K, V, C, TContext>) {
    this.schema = config.schema;

    this.executor = config.executor;
    this.batch = config.batch;
    this.batchingOptions = config.batchingOptions;

    this.createProxyingResolver = config.createProxyingResolver;
    this.transforms = config.transforms ?? [];

    this.merge = config.merge;
  }

  get transformedSchema(): GraphQLSchema {
    if (!this._transformedSchema) {
      if (globalThis.process?.env?.['DEBUG']) {
        console.warn('Transformed schema is not set yet. Returning a dummy one.');
      }
      this._transformedSchema = applySchemaTransforms(this.schema, this);
    }
    return this._transformedSchema;
  }

  set transformedSchema(value: GraphQLSchema) {
    this._transformedSchema = value;
  }
}
