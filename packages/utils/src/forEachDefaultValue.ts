import { getNamedType, GraphQLSchema, isObjectType, isInputObjectType } from 'graphql';

import { IDefaultValueIteratorFn } from './Interfaces.js';

export function forEachDefaultValue(schema: GraphQLSchema, fn: IDefaultValueIteratorFn): void {
  const typeMap = schema.getTypeMap();
  for (const typeName in typeMap) {
    const type = typeMap[typeName];

    if (!getNamedType(type).name.startsWith('__')) {
      if (isObjectType(type)) {
        const fields = type.getFields();
        for (const fieldName in fields) {
          const field = fields[fieldName];

          for (const arg of field.args) {
            arg.defaultValue = fn(arg.type, arg.defaultValue);
          }
        }
      } else if (isInputObjectType(type)) {
        const fields = type.getFields();
        for (const fieldName in fields) {
          const field = fields[fieldName];
          field.defaultValue = fn(field.type, field.defaultValue);
        }
      }
    }
  }
}
