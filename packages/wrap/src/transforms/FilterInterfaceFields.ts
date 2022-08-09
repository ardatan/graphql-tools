import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { FieldFilter } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import TransformInterfaceFields from './TransformInterfaceFields.js';

interface FilterInterfaceFieldsTransformationContext extends Record<string, any> {}

export default class FilterInterfaceFields<TContext = Record<string, any>>
  implements Transform<FilterInterfaceFieldsTransformationContext, TContext>
{
  private readonly transformer: TransformInterfaceFields<TContext>;

  constructor(filter: FieldFilter) {
    this.transformer = new TransformInterfaceFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) =>
        filter(typeName, fieldName, fieldConfig) ? undefined : null
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
