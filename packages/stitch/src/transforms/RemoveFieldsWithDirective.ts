import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { Transform, getDirectives, matchDirectiveValue } from '@graphql-tools/utils';
import { FilterObjectFields } from '@graphql-tools/wrap';

export default class RemoveFieldsWithDirective implements Transform {
  private readonly directiveName: string;
  private readonly args: Record<string, any>;

  constructor(directiveName: string, args: Record<string, any> = {}) {
    this.directiveName = directiveName;
    this.args = args;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const transformer = new FilterObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const valueMap = getDirectives(originalSchema, fieldConfig);
        return !fieldConfig.astNode.directives.find(dir => {
          return dir.name.value === this.directiveName && matchDirectiveValue(valueMap[dir.name.value], this.args);
        });
      }
    );

    return transformer.transformSchema(originalSchema);
  }
}
