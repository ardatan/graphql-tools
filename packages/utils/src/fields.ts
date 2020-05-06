import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLFieldConfig } from 'graphql';

import { TypeMap } from './Interfaces';

export function appendFields(
  typeMap: TypeMap,
  typeName: string,
  additionalFields: GraphQLFieldConfigMap<any, any>
): void {
  let type = typeMap[typeName];
  if (type != null) {
    const config = (type as GraphQLObjectType).toConfig();
    const originalFieldConfigMap = config.fields;

    const newFieldConfigMap = {};
    Object.keys(config.fields).forEach(fieldName => {
      newFieldConfigMap[fieldName] = originalFieldConfigMap[fieldName];
    });

    Object.keys(additionalFields).forEach(fieldName => {
      newFieldConfigMap[fieldName] = additionalFields[fieldName];
    });

    type = new GraphQLObjectType({
      ...config,
      fields: newFieldConfigMap,
    });
  } else {
    type = new GraphQLObjectType({
      name: typeName,
      fields: additionalFields,
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

  const config = (type as GraphQLObjectType).toConfig();
  const originalFieldConfigMap = config.fields;

  const newFieldConfigMap = {};
  const removedFields = {};
  Object.keys(originalFieldConfigMap).forEach(fieldName => {
    const originalFieldConfig = originalFieldConfigMap[fieldName];
    if (testFn(fieldName, originalFieldConfig)) {
      removedFields[fieldName] = originalFieldConfig;
    } else {
      newFieldConfigMap[fieldName] = originalFieldConfig;
    }
  });

  type = new GraphQLObjectType({
    ...config,
    fields: newFieldConfigMap,
  });
  typeMap[typeName] = type;

  return removedFields;
}
