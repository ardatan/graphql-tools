import { GraphQLSchema } from 'graphql';
import { Transform, MapperKind, mapSchema } from '@graphql-tools/utils';

export class RemoveDeprecations implements Transform {
  private readonly reason: string;

  constructor({ reason }: { reason: string }) {
    this.reason = reason;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return mapSchema(schema, {
      [MapperKind.FIELD]: field => {
        if (field.deprecationReason === this.reason) {
          field = {
            ...field,
            astNode: {
              ...field.astNode,
              directives: field.astNode.directives.filter(dir => dir.name.value !== 'deprecated'),
            },
          };
          delete field.deprecationReason;
          return field;
        }
      },
    });
  }
}
