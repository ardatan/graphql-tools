import { Transform, MapperKind, mapSchema } from '@graphql-tools/utils';

export class RemoveDeprecations implements Transform {
  constructor(reason) {
    this.reason = reason;
  }

  transformSchema(schema) {
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
