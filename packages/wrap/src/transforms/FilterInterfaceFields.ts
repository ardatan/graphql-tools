import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Transform, FieldFilter } from '@graphql-tools/utils';

import TransformInterfaceFields from './TransformInterfaceFields';

export default class FilterInterfaceFields implements Transform {
  private readonly transformer: TransformInterfaceFields;

  constructor(filter: FieldFilter) {
    this.transformer = new TransformInterfaceFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) =>
        filter(typeName, fieldName, fieldConfig) ? undefined : null
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
