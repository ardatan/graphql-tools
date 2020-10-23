import { GraphQLSchema } from 'graphql';

import { PruneSchemaOptions, pruneSchema } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

export default class PruneTypes implements Transform {
  private readonly options: PruneSchemaOptions;

  constructor(options: PruneSchemaOptions = {}) {
    this.options = options;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return pruneSchema(originalWrappingSchema, this.options);
  }
}
