import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { Transform } from '@graphql-tools/utils';
import { FilterObjectFields } from '@graphql-tools/wrap';

export class RemoveDeprecatedFields implements Transform {
  private readonly reason: string;
  private readonly transformer: FilterObjectFields;

  constructor({ reason }: { reason: string }) {
    this.reason = reason;
    this.transformer = new FilterObjectFields(
      (_typeName: string, _fieldName: string, fieldConfig: GraphQLFieldConfig<any, any>) => {
        return fieldConfig.deprecationReason === this.reason ? undefined : null;
      }
    );
  }

  public transformSchema(originalSchema: GraphQLSchema): GraphQLSchema {
    return this.transformer.transformSchema(originalSchema);
  }
}
