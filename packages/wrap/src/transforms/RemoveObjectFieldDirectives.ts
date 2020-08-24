import { GraphQLSchema } from 'graphql';
import { Transform, valueMatchesCriteria } from '@graphql-tools/utils';
import { FilterObjectFieldDirectives } from '@graphql-tools/wrap';

export default class RemoveObjectFieldDirectives implements Transform {
  private readonly transformer: FilterObjectFieldDirectives;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.transformer = new FilterObjectFieldDirectives((dirName: string, dirValue: any) => {
      return !(valueMatchesCriteria(dirName, directiveName) && valueMatchesCriteria(dirValue, args));
    });
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
