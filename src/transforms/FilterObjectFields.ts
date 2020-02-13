import { Transform } from './transforms';
import TransformObjectFields from './TransformObjectFields';

import { GraphQLField, GraphQLSchema } from 'graphql';

export type ObjectFilter = (typeName: string, fieldName: string, field: GraphQLField<any, any>) => boolean;

export default class FilterObjectFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(filter: ObjectFilter) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, field: GraphQLField<any, any>) =>
        filter(typeName, fieldName, field) ? undefined : null
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
