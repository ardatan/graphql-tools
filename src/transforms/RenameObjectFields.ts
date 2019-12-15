import { GraphQLField, GraphQLSchema } from 'graphql';
import { Transform } from './transforms';
import { Request } from '../Interfaces';
import TransformObjectFields from './TransformObjectFields';

export default class RenameObjectFields implements Transform {
  private transformer: TransformObjectFields;

  constructor(renamer: (typeName: string, fieldName: string, field: GraphQLField<any, any>) => string) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
        return {
          name: renamer(typeName, fieldName, field),
        };
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }

  public transformRequest(originalRequest: Request): Request {
    return this.transformer.transformRequest(originalRequest);
  }
}
