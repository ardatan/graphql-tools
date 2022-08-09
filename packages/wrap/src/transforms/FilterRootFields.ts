import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { RootFieldFilter } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import TransformRootFields from './TransformRootFields.js';

interface FilterRootFieldsTransformationContext extends Record<string, any> {}

export default class FilterRootFields<TContext = Record<string, any>>
  implements Transform<FilterRootFieldsTransformationContext, TContext>
{
  private readonly transformer: TransformRootFields<TContext>;

  constructor(filter: RootFieldFilter) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        fieldConfig: GraphQLFieldConfig<any, any>
      ) => {
        if (filter(operation, fieldName, fieldConfig)) {
          return undefined;
        }

        return null;
      }
    );
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
