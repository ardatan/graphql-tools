import { GraphQLSchema, GraphQLFieldConfig, DirectiveDefinitionNode } from 'graphql';
import { Transform } from '@graphql-tools/utils';
import { TransformObjectFields } from '@graphql-tools/wrap';

export class RemoveDeprecations implements Transform {
  private readonly reason: string;
  private readonly transformer: TransformObjectFields;

  constructor({ reason }: { reason: string }) {
    this.reason = reason;
    this.transformer = new TransformObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        if (fieldConfig.deprecationReason === this.reason) {
          fieldConfig = {
            ...fieldConfig,
            astNode: {
              ...fieldConfig.astNode,
              directives: fieldConfig.astNode.directives.filter(
                (dir: DirectiveDefinitionNode) => dir.name.value !== 'deprecated'
              ),
            },
          };
          delete fieldConfig.deprecationReason;
          return fieldConfig;
        }
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
