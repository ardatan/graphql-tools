import { getNamedType, GraphQLInputObjectType, GraphQLSchema, GraphQLObjectType } from 'graphql';
import { IDefaultValueIteratorFn } from '../Interfaces';

export function forEachDefaultValue(schema: GraphQLSchema, fn: IDefaultValueIteratorFn): void {

  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];

    if (!getNamedType(type).name.startsWith('__')) {
      if (type instanceof GraphQLObjectType) {
        const fields = type.getFields();
        Object.keys(fields).forEach(fieldName => {
          const field = fields[fieldName];

          field.args.forEach(arg => {
            arg.defaultValue = fn(arg.type, arg.defaultValue);
          });
        });
      } else if (type instanceof GraphQLInputObjectType) {
        const fields = type.getFields();
        Object.keys(fields).forEach(fieldName => {
          const field = fields[fieldName];
          field.defaultValue = fn(field.type, field.defaultValue);
        });
      }
    }
  });
}
