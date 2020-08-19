import { GraphQLSchema } from 'graphql';
import { Transform, MapperKind, mapSchema } from '@graphql-tools/utils';

export class RemoveDeprecatedFields implements Transform {
  private readonly reason: string;

  constructor({ reason }: { reason: string }) {
    this.reason = reason;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    return mapSchema(schema, {
      [MapperKind.FIELD]: field => (field.deprecationReason === this.reason ? undefined : null),
    });
  }
}
