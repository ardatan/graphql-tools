import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { RootFieldFilter } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import TransformRootFields from './TransformRootFields';

export default class FilterRootFields<T = any, TContext = Record<string, any>> implements Transform<T, TContext> {
  private readonly transformer: TransformRootFields<T, TContext>;

  constructor(filter: RootFieldFilter) {
    this.transformer = new TransformRootFields<T, TContext>(
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
    subschemaConfig: SubschemaConfig<any, any, any, TContext>,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
  }
}
