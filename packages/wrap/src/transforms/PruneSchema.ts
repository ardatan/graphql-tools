import { GraphQLSchema } from 'graphql';

import { PruneSchemaOptions, pruneSchema } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

export default class PruneTypes<T = any, TContext = Record<string, any>> implements Transform<T, TContext> {
  private readonly options: PruneSchemaOptions;

  constructor(options: PruneSchemaOptions = {}) {
    this.options = options;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return pruneSchema(originalWrappingSchema, this.options);
  }
}
