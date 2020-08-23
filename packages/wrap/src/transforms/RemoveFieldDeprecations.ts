import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { Transform, valueMatchesCriteria } from '@graphql-tools/utils';
import { FilterFieldDirectives, TransformObjectFields } from '@graphql-tools/wrap';

export default class RemoveFieldDeprecations implements Transform {
  private readonly removeDirectives: FilterFieldDirectives;
  private readonly removeDeprecations: TransformObjectFields;

  constructor(reason: string | RegExp) {
    const args = { reason };
    this.removeDirectives = new FilterFieldDirectives((dirName: string, dirValue: any) => {
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
