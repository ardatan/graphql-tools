import { GraphQLField, GraphQLSchema } from 'graphql';

import { Request } from '../Interfaces';

import { Transform } from './transforms';
import TransformRootFields from './TransformRootFields';

export default class RenameRootFields implements Transform {
  private readonly transformer: TransformRootFields;

  constructor(
    renamer: (
      operation: 'Query' | 'Mutation' | 'Subscription',
      name: string,
      field: GraphQLField<any, any>,
    ) => string,
  ) {
    this.transformer = new TransformRootFields(
      (
        operation: 'Query' | 'Mutation' | 'Subscription',
        fieldName: string,
        field: GraphQLField<any, any>,
      ) => ({
          name: renamer(operation, fieldName, field),
        }),
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
