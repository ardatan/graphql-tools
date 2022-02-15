import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { ObjectFieldFilter } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import TransformObjectFields from './TransformObjectFields';

export default class FilterObjectFields<T = any, TContext = Record<string, any>> implements Transform<T, TContext> {
  private readonly transformer: TransformObjectFields<T, TContext>;

  constructor(filter: ObjectFieldFilter) {
    this.transformer = new TransformObjectFields<T, TContext>(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, TContext>) =>
        filter(typeName, fieldName, fieldConfig) ? undefined : null
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
  }
}
