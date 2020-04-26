import {
  GraphQLFieldConfigMap,
  GraphQLObjectType,
  GraphQLFieldConfig,
} from 'graphql';

import { TypeMap } from '../Interfaces';

import { toConfig } from './toConfig';

export function appendFields(
  typeMap: TypeMap,
  typeName: string,
  fields: GraphQLFieldConfigMap<any, any>,
): void {
  let type = typeMap[typeName];
  if (type != null) {
    const typeConfig = toConfig(type as GraphQLObjectType);

    const newFields: any = Object.entries(typeConfig.fields).reduce(
      (prev, [key, val]) => ({
        ...prev,
        [key]: val,
      }),
      {},
    );

    Object.keys(fields).forEach((fieldName) => {
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
  const typeConfig = toConfig(type as GraphQLObjectType);
  const originalFields = typeConfig.fields;
  const newFields = {};
  const removedFields = {};
  Object.keys(originalFields).forEach((fieldName) => {
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
