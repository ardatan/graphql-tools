import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { getDirectives, valueMatchesCriteria } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import FilterObjectFields from './FilterObjectFields';

export default class RemoveObjectFieldsWithDirective implements Transform {
  private readonly directiveName: string | RegExp;
  private readonly args: Record<string, any>;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.directiveName = directiveName;
    this.args = args;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaOrSubschemaConfig?: GraphQLSchema | SubschemaConfig,
    transforms?: Array<Transform>,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    const transformer = new FilterObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const valueMap = getDirectives(originalWrappingSchema, fieldConfig);
        return !Object.keys(valueMap).some(
          directiveName =>
            valueMatchesCriteria(directiveName, this.directiveName) &&
            ((Array.isArray(valueMap[directiveName]) &&
              valueMap[directiveName].some((value: any) => valueMatchesCriteria(value, this.args))) ||
              valueMatchesCriteria(valueMap[directiveName], this.args))
        );
      }
    );

    return transformer.transformSchema(
      originalWrappingSchema,
      subschemaOrSubschemaConfig,
      transforms,
      transformedSchema
    );
  }
}
