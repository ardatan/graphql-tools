import { GraphQLSchema } from 'graphql';

import { PruneSchemaOptions, pruneSchema } from '@graphql-tools/utils';

import { Transform } from '@graphql-tools/delegate';

export default class PruneTypes implements Transform {
  private readonly options: PruneSchemaOptions;

  constructor(options: PruneSchemaOptions = {}) {
    this.options = options;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return pruneSchema(schema, this.options);
  }
}
