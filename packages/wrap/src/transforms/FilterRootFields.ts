import { GraphQLField, GraphQLSchema } from 'graphql';

import { Transform, RootFieldFilter } from '@graphql-tools/utils';

import TransformRootFields from './TransformRootFields';

export default class FilterRootFields implements Transform {
  private readonly transformer: TransformRootFields;

  constructor(filter: RootFieldFilter) {
    this.transformer = new TransformRootFields(
      (operation: 'Query' | 'Mutation' | 'Subscription', fieldName: string, field: GraphQLField<any, any>) => {
        if (filter(operation, fieldName, field)) {
          return undefined;
        }

        return null;
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
