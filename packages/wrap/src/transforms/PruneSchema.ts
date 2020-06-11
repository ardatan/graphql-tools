import { GraphQLSchema } from 'graphql';

import { Transform, PruneSchemaOptions, pruneSchema } from '@graphql-tools/utils';

export default class PruneTypes implements Transform {
  private readonly options: PruneSchemaOptions;

  constructor(options: PruneSchemaOptions) {
    this.options = options;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return pruneSchema(schema, this.options);
  }
}
