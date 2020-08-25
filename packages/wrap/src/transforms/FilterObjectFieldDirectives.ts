import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { Transform, getArgumentValues } from '@graphql-tools/utils';

import TransformObjectFields from './TransformObjectFields';

export default class FilterObjectFieldDirectives implements Transform {
  private readonly filter: (dirName: string, dirValue: any) => boolean;

  constructor(filter: (dirName: string, dirValue: any) => boolean) {
    this.filter = filter;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const transformer = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const keepDirectives = fieldConfig.astNode.directives.filter(dir => {
          const directiveDef = originalSchema.getDirective(dir.name.value);
          const directiveValue = directiveDef ? getArgumentValues(directiveDef, dir) : undefined;
          return this.filter(dir.name.value, directiveValue);
        });

        if (keepDirectives.length !== fieldConfig.astNode.directives.length) {
          fieldConfig = {
            ...fieldConfig,
            astNode: {
              ...fieldConfig.astNode,
              directives: keepDirectives,
            },
          };
          return fieldConfig;
        }
      }
    );

    return transformer.transformSchema(originalSchema);
  }
}
