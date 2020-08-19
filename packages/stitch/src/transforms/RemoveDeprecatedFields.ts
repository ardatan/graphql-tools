import { Transform, MapperKind, mapSchema } from '@graphql-tools/utils';

export class RemoveDeprecatedFields implements Transform {
  constructor(reason) {
    this.reason = reason;
  }

  transformSchema(schema) {
    return mapSchema(schema, {
      [MapperKind.FIELD]: field => (field.deprecationReason === this.reason ? undefined : null),
    });
  }
}
