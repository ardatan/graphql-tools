import { GraphQLSchema } from 'graphql';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { pruneSchema, PruneSchemaOptions } from '@graphql-tools/utils';

interface PruneTypesTransformationContext extends Record<string, any> {}

export default class PruneTypes<TContext = Record<string, any>>
  implements Transform<PruneTypesTransformationContext, TContext>
{
  private readonly options: PruneSchemaOptions;

  constructor(options: PruneSchemaOptions = {}) {
    this.options = options;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    _subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    return pruneSchema(originalWrappingSchema, this.options);
  }
}
