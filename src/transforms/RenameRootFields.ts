import { GraphQLNamedType, GraphQLField } from 'graphql';
import { Transform } from './transforms';
import {
  createResolveType,
  fieldToFieldConfig,
} from '../stitching/schemaRecreation';
import TransformRootFields from './TransformRootFields';

export default function RenameRootFields(
  renamer: (
    operation: 'Query' | 'Mutation' | 'Subscription',
    name: string,
    field: GraphQLField<any, any>,
  ) => string,
): Transform {
  const resolveType = createResolveType(
    (name: string, type: GraphQLNamedType): GraphQLNamedType => type,
  );
  return TransformRootFields(
    (
      operation: 'Query' | 'Mutation' | 'Subscription',
      fieldName: string,
      field: GraphQLField<any, any>,
    ) => {
      return {
        name: renamer(operation, fieldName, field),
        field: fieldToFieldConfig(field, resolveType, true),
      };
    },
  );
}
