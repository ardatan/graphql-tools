import { GraphQLField, GraphQLSchema } from 'graphql';

import { Transform, FieldFilter } from '../../Interfaces';

import TransformInterfaceFields from './TransformInterfaceFields';

export default class FilterInterfaceFields implements Transform {
  private readonly transformer: TransformInterfaceFields;

  constructor(filter: FieldFilter) {
    this.transformer = new TransformInterfaceFields(
      (typeName: string, fieldName: string, field: GraphQLField<any, any>) =>
        filter(typeName, fieldName, field) ? undefined : null
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
