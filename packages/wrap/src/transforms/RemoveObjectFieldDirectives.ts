import { GraphQLSchema } from 'graphql';

import { valueMatchesCriteria } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import FilterObjectFieldDirectives from './FilterObjectFieldDirectives';

export default class RemoveObjectFieldDirectives implements Transform {
  private readonly transformer: FilterObjectFieldDirectives;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.transformer = new FilterObjectFieldDirectives((dirName: string, dirValue: any) => {
      return !(valueMatchesCriteria(dirName, directiveName) && valueMatchesCriteria(dirValue, args));
    });
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig, transformedSchema);
  }
}
