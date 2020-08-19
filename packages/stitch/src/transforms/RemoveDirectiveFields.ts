import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { Transform, matchDirective } from '@graphql-tools/utils';
import { FilterObjectFields } from '@graphql-tools/wrap';

export default class RemoveDirectiveFields implements Transform {
  private readonly transformer: FilterObjectFields;

  constructor(directiveName: string, args: Record<string, any> = {}) {
    this.transformer = new FilterObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        return !!fieldConfig.astNode.directives.find(dir => matchDirective(dir, directiveName, args));
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
