import { GraphQLField, GraphQLSchema } from 'graphql';

import { Transform, FieldFilter } from '../../Interfaces';

import TransformObjectFields from './TransformObjectFields';

export default class FilterObjectFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(filter: FieldFilter) {
    this.transformer = new TransformObjectFields((typeName: string, fieldName: string, field: GraphQLField<any, any>) =>
      filter(typeName, fieldName, field) ? undefined : null
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
