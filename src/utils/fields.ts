import {
  GraphQLFieldConfigMap,
  GraphQLObjectTypeConfig,
  GraphQLObjectType,
  GraphQLFieldConfig,
} from 'graphql';
import { TypeMap } from 'graphql/type/schema';

export function appendFields(
  typeMap: TypeMap,
  typeName: string,
  fields: GraphQLFieldConfigMap<any, any>,
): void {
  let type = typeMap[typeName];
  if (type) {
    const typeConfig = type.toConfig() as GraphQLObjectTypeConfig<any, any>;
    const originalFields = typeConfig.fields;
    const newFields = {};
    Object.keys(originalFields).forEach(fieldName => {
      newFields[fieldName] = originalFields[fieldName];
    });
    Object.keys(fields).forEach(fieldName => {
      newFields[fieldName] = fields[fieldName];
    });
    type = new GraphQLObjectType({
      ...typeConfig,
      fields: newFields,
    });
  } else {
    type = new GraphQLObjectType({
      name: typeName,
      fields,
    });
  }
  typeMap[typeName] = type;
}

export function removeFields(
  typeMap: TypeMap,
  typeName: string,
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean,
): GraphQLFieldConfigMap<any, any> {
  let type = typeMap[typeName];
  const typeConfig = type.toConfig() as GraphQLObjectTypeConfig<any, any>;
  const originalFields = typeConfig.fields;
  const newFields = {};
  const removedFields = {};
  Object.keys(originalFields).forEach(fieldName => {
    if (testFn(fieldName, originalFields[fieldName])) {
      removedFields[fieldName] = originalFields[fieldName];
    } else {
      newFields[fieldName] = originalFields[fieldName];
    }
  });
  type = new GraphQLObjectType({
    ...typeConfig,
    fields: newFields,
  });
  typeMap[typeName] = type;

  return removedFields;
}
