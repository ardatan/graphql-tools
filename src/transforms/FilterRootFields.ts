import { Transform } from './transforms';
import TransformRootFields from './TransformRootFields';

import { GraphQLField, GraphQLSchema } from 'graphql';

export type RootFilter = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) => boolean;

export default class FilterRootFields implements Transform {
  private readonly transformer: TransformRootFields;

  constructor(filter: RootFilter) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        field: GraphQLField<any, any>,
      ) => {
        if (filter(operation, fieldName, field)) {
          return undefined;
        }

        return null;
      },
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
