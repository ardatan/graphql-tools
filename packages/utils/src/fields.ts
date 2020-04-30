import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLFieldConfig } from 'graphql';

import { TypeMap } from './Interfaces';
import { fieldToFieldConfig } from './toConfig';

export function appendFields(typeMap: TypeMap, typeName: string, fields: GraphQLFieldConfigMap<any, any>): void {
  let type = typeMap[typeName];
  if (type != null) {
    const newFieldConfigMap: GraphQLFieldConfigMap<any, any> = Object.entries(
      (type as GraphQLObjectType).getFields()
    ).reduce(
      (acc, [fieldName, field]) => ({
        ...acc,
        [fieldName]: fieldToFieldConfig(field),
      }),
      {}
    );

    Object.keys(fields).forEach(fieldName => {
      newFieldConfigMap[fieldName] = fields[fieldName];
    });
    type = new GraphQLObjectType({
      ...(type as GraphQLObjectType).toConfig(),
      fields: newFieldConfigMap,
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
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean
): GraphQLFieldConfigMap<any, any> {
  let type = typeMap[typeName];

  const originalFields = (type as GraphQLObjectType).getFields();
  const newFields = {};
  const removedFields = {};
  Object.keys(originalFields).forEach(fieldName => {
    const originalFieldConfig = fieldToFieldConfig(originalFields[fieldName]);
    if (testFn(fieldName, originalFieldConfig)) {
      removedFields[fieldName] = originalFieldConfig;
    } else {
      newFields[fieldName] = originalFieldConfig;
    }
  });

  type = new GraphQLObjectType({
    ...(type as GraphQLObjectType).toConfig(),
    fields: newFields,
  });
  typeMap[typeName] = type;

  return removedFields;
}
