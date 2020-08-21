import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { Transform, getDirectives } from '@graphql-tools/utils';
import TransformObjectFields from './TransformObjectFields';

export default class FilterFieldDirectives implements Transform {
  private readonly filter: (dirName: string, dirValue: any) => boolean;

  constructor(filter: (dirName: string, dirValue: any) => boolean) {
    this.filter = filter;
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    const transformer = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const valueMap = getDirectives(originalSchema, fieldConfig);
        const keepDirectives = fieldConfig.astNode.directives.filter(dir =>
          this.filter(dir.name.value, valueMap[dir.name.value])
        );

        if (keepDirectives.length !== fieldConfig.astNode.directives.length) {
          fieldConfig = {
            ...fieldConfig,
            astNode: {
              ...fieldConfig.astNode,
              directives: keepDirectives,
            },
          };

          if (fieldConfig.deprecationReason && !keepDirectives.some(dir => dir.name.value === 'deprecated')) {
            delete fieldConfig.deprecationReason;
          }
          return fieldConfig;
        }
      }
    );

    return transformer.transformSchema(originalSchema);
  }
}
