import { GraphQLField, GraphQLSchema } from 'graphql';
import { Transform } from './transforms';
import TransformObjectFields from './TransformObjectFields';

export type ObjectFilter = (typeName: string, fieldName: string, field: GraphQLField<any, any>) => boolean;

export default class FilterObjectFields implements Transform {
  private transformer: TransformObjectFields;

  constructor(filter: ObjectFilter) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, field: GraphQLField<any, any>) => {
        if (filter(typeName, fieldName, field)) {
          return undefined;
        } else {
          return null;
        }
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
