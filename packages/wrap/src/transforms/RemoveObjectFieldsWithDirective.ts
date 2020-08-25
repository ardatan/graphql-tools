import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Transform, getDirectives, valueMatchesCriteria } from '@graphql-tools/utils';

import FilterObjectFields from './FilterObjectFields';

export default class RemoveObjectFieldsWithDirective implements Transform {
  private readonly directiveName: string | RegExp;
  private readonly args: Record<string, any>;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.directiveName = directiveName;
    this.args = args;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const transformer = new FilterObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const valueMap = getDirectives(originalSchema, fieldConfig);
        return !Object.keys(valueMap).some(
          directiveName =>
            valueMatchesCriteria(directiveName, this.directiveName) &&
            ((Array.isArray(valueMap[directiveName]) &&
              valueMap[directiveName].some((value: any) => valueMatchesCriteria(value, this.args))) ||
              valueMatchesCriteria(valueMap[directiveName], this.args))
        );
      }
    );

    return transformer.transformSchema(originalSchema);
  }
}
