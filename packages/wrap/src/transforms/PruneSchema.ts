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
    _subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig,
    _transforms?: Array<Transform>,
    _transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return pruneSchema(originalWrappingSchema, this.options);
  }
}
