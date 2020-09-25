import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { RootFieldFilter } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import TransformRootFields from './TransformRootFields';

export default class FilterRootFields implements Transform {
  private readonly transformer: TransformRootFields;

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

  public transformSchema(originalWrappingSchema: GraphQLSchema, subschemaConfig?: SubschemaConfig): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
