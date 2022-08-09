import { GraphQLSchema } from 'graphql';

import { valueMatchesCriteria } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import FilterObjectFields from './FilterObjectFields.js';

interface RemoveObjectFieldsWithDeprecationTransformationContext extends Record<string, any> {}

export default class RemoveObjectFieldsWithDeprecation<TContext = Record<string, any>>
  implements Transform<RemoveObjectFieldsWithDeprecationTransformationContext, TContext>
{
  private readonly transformer: FilterObjectFields<TContext>;

  constructor(reason: string | RegExp) {
    this.transformer = new FilterObjectFields((_typeName, _fieldName, fieldConfig) => {
      if (fieldConfig.deprecationReason) {
        return !valueMatchesCriteria(fieldConfig.deprecationReason, reason);
      }
      return true;
    });
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
