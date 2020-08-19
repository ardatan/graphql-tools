import { GraphQLSchema, GraphQLFieldConfig, DirectiveNode } from 'graphql';
import { Transform } from '@graphql-tools/utils';
import TransformObjectFields from './TransformObjectFields';

export default class FilterFieldDirectives implements Transform {
  private readonly transformer: TransformObjectFields;

  constructor(filter: (dir: DirectiveNode) => boolean) {
    this.transformer = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        const keepDirectives = fieldConfig.astNode.directives.filter(dir => filter(dir));

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
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
