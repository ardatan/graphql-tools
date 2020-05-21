import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Transform, FieldFilter } from '@graphql-tools/utils';

import TransformObjectFields from './TransformObjectFields';

export default class FilterObjectFields implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(filter: FieldFilter) {
    this.transformer = new TransformObjectFields(
      (typeName: string, fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) =>
        filter(typeName, fieldName, fieldConfig) ? undefined : null
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
