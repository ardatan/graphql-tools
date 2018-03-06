import { GraphQLField } from 'graphql';
import { Transform } from './transforms';
import TransformRootFields from './TransformRootFields';

export type RootFilter = (
  operation: 'Query' | 'Mutation' | 'Subscription',
  fieldName: string,
  field: GraphQLField<any, any>,
) => Boolean;

export default function FilterRootFields(filter: RootFilter): Transform {
  return TransformRootFields(
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
