import { GraphQLField, GraphQLSchema } from 'graphql';
import { Transform } from './transforms';
import TransformRootFields from './TransformRootFields';

export type RootFilter = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) => Boolean;

export default class FilterRootFields implements Transform {
  private transformer: TransformRootFields;

  constructor(filter: RootFilter) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        field: GraphQLField<any, any>,
      ) => {
        if (filter(operation, fieldName, field)) {
          return undefined;
        } else {
          return null;
        }
      },
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
