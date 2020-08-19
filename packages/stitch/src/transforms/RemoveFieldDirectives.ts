import { GraphQLSchema, DirectiveNode } from 'graphql';
import { Transform, matchDirective } from '@graphql-tools/utils';
import { FilterFieldDirectives } from '@graphql-tools/wrap';

export default class RemoveFieldDirectives implements Transform {
  private readonly transformer: FilterFieldDirectives;

  constructor(directiveName: string, args: Record<string, any> = {}) {
    this.transformer = new FilterFieldDirectives((dir: DirectiveNode) => !matchDirective(dir, directiveName, args));
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
