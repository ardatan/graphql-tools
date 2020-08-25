import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Transform, valueMatchesCriteria } from '@graphql-tools/utils';

import FilterObjectFieldDirectives from './FilterObjectFieldDirectives';
import TransformObjectFields from './TransformObjectFields';

export default class RemoveObjectFieldDeprecations implements Transform {
  private readonly removeDirectives: FilterObjectFieldDirectives;
  private readonly removeDeprecations: TransformObjectFields;

  constructor(reason: string | RegExp) {
    const args = { reason };
    this.removeDirectives = new FilterObjectFieldDirectives((dirName: string, dirValue: any) => {
      return !(dirName === 'deprecated' && valueMatchesCriteria(dirValue, args));
    });
    this.removeDeprecations = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        if (fieldConfig.deprecationReason && valueMatchesCriteria(fieldConfig.deprecationReason, reason)) {
          fieldConfig = { ...fieldConfig };
          delete fieldConfig.deprecationReason;
        }
        return fieldConfig;
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.removeDeprecations.transformSchema(this.removeDirectives.transformSchema(originalSchema));
  }
}
