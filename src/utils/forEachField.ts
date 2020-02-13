import { getNamedType, GraphQLObjectType, GraphQLSchema } from 'graphql';

import { IFieldIteratorFn } from '../Interfaces';

export function forEachField(
  schema: GraphQLSchema,
  fn: IFieldIteratorFn,
): void {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];

    // TODO: maybe have an option to include these?
    if (
      !getNamedType(type).name.startsWith('__') &&
      type instanceof GraphQLObjectType
    ) {
      const fields = type.getFields();
      Object.keys(fields).forEach(fieldName => {
        const field = fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}
