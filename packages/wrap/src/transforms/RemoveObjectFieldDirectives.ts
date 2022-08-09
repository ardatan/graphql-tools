import { GraphQLSchema } from 'graphql';

import { valueMatchesCriteria } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import FilterObjectFieldDirectives from './FilterObjectFieldDirectives.js';

interface RemoveObjectFieldDirectivesTransformationContext extends Record<string, any> {}

export default class RemoveObjectFieldDirectives<TContext = Record<string, any>>
  implements Transform<RemoveObjectFieldDirectivesTransformationContext, TContext>
{
  private readonly transformer: FilterObjectFieldDirectives<TContext>;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.transformer = new FilterObjectFieldDirectives((dirName: string, dirValue: any) => {
      return !(valueMatchesCriteria(dirName, directiveName) && valueMatchesCriteria(dirValue, args));
    });
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    return this.transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
