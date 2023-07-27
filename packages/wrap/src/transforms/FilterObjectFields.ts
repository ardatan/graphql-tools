import { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { ObjectFieldFilter } from '@graphql-tools/utils';
import TransformObjectFields from './TransformObjectFields.js';

interface FilterObjectFieldsTransformationContext extends Record<string, any> {}

export default class FilterObjectFields<TContext = Record<string, any>>
  implements Transform<FilterObjectFieldsTransformationContext, TContext>
{
  private readonly transformer: TransformObjectFields<TContext>;

  constructor(filter: ObjectFieldFilter) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, TContext>) =>
        filter(typeName, fieldName, fieldConfig) ? undefined : null,
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
