import { GraphQLSchema } from 'graphql';
import { Transform, matchDirectiveValue } from '@graphql-tools/utils';
import { FilterFieldDirectives } from '@graphql-tools/wrap';

export default class RemoveFieldDirectives implements Transform {
  private readonly transformer: FilterFieldDirectives;

  constructor(directiveName: string, args: Record<string, any> = {}) {
    this.transformer = new FilterFieldDirectives((dirName: string, dirValue: any) => {
      return !(directiveName === dirName && matchDirectiveValue(dirValue, args));
    });
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
