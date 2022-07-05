import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';

import { getArgumentValues } from '@graphql-tools/utils';

import { SubschemaConfig, Transform } from '@graphql-tools/delegate';

import TransformObjectFields from './TransformObjectFields.js';

interface FilterObjectFieldDirectivesTransformationContext extends Record<string, any> {}

export default class FilterObjectFieldDirectives<TContext = Record<string, any>>
  implements Transform<FilterObjectFieldDirectivesTransformationContext, TContext>
{
  private readonly filter: (dirName: string, dirValue: any) => boolean;

  constructor(filter: (dirName: string, dirValue: any) => boolean) {
    this.filter = filter;
  }

  public transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig<any, any, any, TContext>
  ): GraphQLSchema {
    const transformer = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const keepDirectives =
          fieldConfig.astNode?.directives?.filter(dir => {
            const directiveDef = originalWrappingSchema.getDirective(dir.name.value);
            const directiveValue = directiveDef ? getArgumentValues(directiveDef, dir) : undefined;
            return this.filter(dir.name.value, directiveValue);
          }) ?? [];

        if (
          fieldConfig.astNode?.directives != null &&
          keepDirectives.length !== fieldConfig.astNode.directives.length
        ) {
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

    return transformer.transformSchema(originalWrappingSchema, subschemaConfig);
  }
}
