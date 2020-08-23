import { GraphQLSchema } from 'graphql';
import { Transform, valueMatchesCriteria } from '@graphql-tools/utils';
import { FilterFieldDirectives } from '@graphql-tools/wrap';

export default class RemoveFieldDirectives implements Transform {
  private readonly transformer: FilterFieldDirectives;

  constructor(directiveName: string | RegExp, args: Record<string, any> = {}) {
    this.transformer = new FilterFieldDirectives((dirName: string, dirValue: any) => {
      return !(valueMatchesCriteria(dirName, directiveName) && valueMatchesCriteria(dirValue, args));
    });
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
