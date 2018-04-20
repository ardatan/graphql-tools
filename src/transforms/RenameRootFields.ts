import { GraphQLNamedType, GraphQLField, GraphQLSchema } from 'graphql';
import { Transform } from './transforms';
import {
  createResolveType,
  fieldToFieldConfig,
} from '../stitching/schemaRecreation';
import TransformRootFields from './TransformRootFields';

export default class RenameRootFields implements Transform {
  private transformer: TransformRootFields;

  constructor(
    renamer: (
      operation: 'Query' | 'Mutation' | 'Subscription',
      name: string,
      field: GraphQLField<any, any>,
    ) => string,
  ) {
    const resolveType = createResolveType(
      (name: string, type: GraphQLNamedType): GraphQLNamedType => type,
    );
    this.transformer = new TransformRootFields(
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

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
