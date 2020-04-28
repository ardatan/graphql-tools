import { GraphQLField, GraphQLSchema } from 'graphql';

import { Transform, Request } from '@graphql-tools/utils';

import TransformInterfaceFields from './TransformInterfaceFields';

export default class RenameInterfaceFields implements Transform {
  private readonly transformer: TransformInterfaceFields;

  constructor(renamer: (typeName: string, fieldName: string, field: GraphQLField<any, any>) => string) {
    this.transformer = new TransformInterfaceFields(
      (typeName: string, fieldName: string, field: GraphQLField<any, any>) => ({
        name: renamer(typeName, fieldName, field),
      })
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
