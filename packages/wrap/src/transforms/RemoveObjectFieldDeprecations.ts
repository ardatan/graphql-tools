import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { valueMatchesCriteria } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import FilterObjectFieldDirectives from './FilterObjectFieldDirectives.js';
import TransformObjectFields from './TransformObjectFields.js';

interface RemoveObjectFieldDeprecationsTransformationContext extends Record<string, any> {}

export default class RemoveObjectFieldDeprecations<TContext = Record<string, any>>
  implements Transform<RemoveObjectFieldDeprecationsTransformationContext, TContext>
{
  private readonly removeDirectives: FilterObjectFieldDirectives<TContext>;
  private readonly removeDeprecations: TransformObjectFields<TContext>;

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

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return this.removeDeprecations.transformSchema(
      this.removeDirectives.transformSchema(originalWrappingSchema, subschemaConfig),
      subschemaConfig
    );
  }
}
