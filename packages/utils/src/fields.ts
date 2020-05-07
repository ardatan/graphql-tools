import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { MapperKind } from './Interfaces';
import { mapSchema } from './mapSchema';
import { rewireTypes } from './rewire';

export function modifyFields(
  schema: GraphQLSchema,
  {
    append = [],
    remove = [],
  }: {
    append?: Array<{ typeName: string; additionalFields: GraphQLFieldConfigMap<any, any> }>;
    remove?: Array<{
      typeName: string;
      testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean;
    }>;
  }
): GraphQLSchema {
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const queryTypeName = queryType != null ? queryType.name : undefined;
  const mutationTypeName = mutationType != null ? mutationType.name : undefined;
  const subscriptionTypeName = subscriptionType != null ? subscriptionType.name : undefined;

  const config = schema.toConfig();

  const originalTypeMap = {};
  config.types.forEach(type => {
    originalTypeMap[type.name] = type;
  });

  remove.forEach(({ typeName, testFn }) => {
    const config = (originalTypeMap[typeName] as GraphQLObjectType).toConfig();
    const originalFieldConfigMap = config.fields;
    const newFieldConfigMap = {};
    Object.keys(originalFieldConfigMap).forEach(fieldName => {
      if (!testFn(fieldName, originalFieldConfigMap[fieldName])) {
        newFieldConfigMap[fieldName] = originalFieldConfigMap[fieldName];
      }
    });
    originalTypeMap[typeName] = new GraphQLObjectType({
      ...config,
      fields: newFieldConfigMap,
    });
  });

  append.forEach(({ typeName, additionalFields }) => {
    if (originalTypeMap[typeName] == null) {
      originalTypeMap[typeName] = new GraphQLObjectType({
        name: typeName,
        fields: additionalFields,
      });
    } else {
      const config = (originalTypeMap[typeName] as GraphQLObjectType).toConfig();
      const originalFieldConfigMap = config.fields;
      const newFieldConfigMap = {};
      Object.keys(originalFieldConfigMap).forEach(fieldName => {
        newFieldConfigMap[fieldName] = originalFieldConfigMap[fieldName];
      });
      Object.keys(additionalFields).forEach(fieldName => {
        newFieldConfigMap[fieldName] = additionalFields[fieldName];
      });
      originalTypeMap[typeName] = new GraphQLObjectType({
        ...config,
        fields: newFieldConfigMap,
      });
    }
  });

  const { typeMap, directives } = rewireTypes(originalTypeMap, config.directives);

  return new GraphQLSchema({
    ...config,
    query: queryTypeName ? (typeMap[queryTypeName] as GraphQLObjectType) : undefined,
    mutation: mutationTypeName ? (typeMap[mutationTypeName] as GraphQLObjectType) : undefined,
    subscription: subscriptionTypeName != null ? (typeMap[subscriptionTypeName] as GraphQLObjectType) : undefined,
    types: Object.keys(typeMap).map(typeName => typeMap[typeName]),
    directives,
  });
}

export function appendFields(
  schema: GraphQLSchema,
  typeName: string,
  additionalFields: GraphQLFieldConfigMap<any, any>
): GraphQLSchema {
  return modifyFields(schema, { append: [{ typeName, additionalFields }] });
}

export function removeFields(
  schema: GraphQLSchema,
  typeName: string,
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean
): [GraphQLSchema, GraphQLFieldConfigMap<any, any>] {
  const selectedFields = getFields(schema, typeName, testFn);
  const selectedFieldNames = Object.keys(selectedFields);
  const newSchema = modifyFields(schema, {
    remove: [{ typeName, testFn: fieldName => selectedFieldNames.includes(fieldName) }],
  });

  return [newSchema, selectedFields];
}

export function getFields(
  schema: GraphQLSchema,
  typeName: string,
  testFn: (fieldName: string, field: GraphQLFieldConfig<any, any>) => boolean
): GraphQLFieldConfigMap<any, any> {
  const selectedFields = {};
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === typeName) {
        const config = type.toConfig();
        const originalFieldConfigMap = config.fields;

        Object.keys(originalFieldConfigMap).forEach(fieldName => {
          const originalFieldConfig = originalFieldConfigMap[fieldName];
          if (testFn(fieldName, originalFieldConfig)) {
            selectedFields[fieldName] = originalFieldConfig;
          }
        });
      }

      return undefined;
    },
  });

  return selectedFields;
}
