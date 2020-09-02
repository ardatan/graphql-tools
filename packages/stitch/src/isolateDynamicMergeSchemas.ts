import { isSubschemaConfig, MergedTypeConfig, MergedFieldConfig } from '@graphql-tools/delegate';

import { FilterObjectFields } from '@graphql-tools/wrap';

import { pruneSchema, filterSchema } from '@graphql-tools/utils';

export function isolateDynamicMergeSchemas(
  subschemas: Array<GraphQLSchema | SubschemaConfig>
): Array<GraphQLSchema | SubschemaConfig> {
  const mapped: Array<GraphQLSchema | SubschemaConfig> = [];

  subschemas.forEach(schemaLikeObject => {
    if (isSubschemaConfig(schemaLikeObject) && schemaLikeObject.merge) {
      mapped.push(...splitDynamicMergeSubschemas(schemaLikeObject as SubschemaConfig));
    } else {
      mapped.push(schemaLikeObject);
    }
  });

  return mapped;
}

function splitDynamicMergeSubschemas(subschemaConfig: SubschemaConfig): Array<SubschemaConfig> {
  const staticTypes: Record<string, MergedTypeConfig> = {};
  const dynamicTypes: Record<string, MergedTypeConfig> = {};

  Object.keys(subschemaConfig.merge).forEach((typeName: string) => {
    const mergedTypeConfig: MergedTypeConfig = subschemaConfig.merge[typeName];
    staticTypes[typeName] = mergedTypeConfig;

    if (mergedTypeConfig.fields) {
      const staticFields: Record<string, MergedFieldConfig> = {};
      const dynamicFields: Record<string, MergedFieldConfig> = {};

      Object.keys(mergedTypeConfig.fields).forEach((fieldName: string) => {
        const mergedFieldConfig: MergedFieldConfig = mergedTypeConfig.fields[fieldName];

        if (mergedFieldConfig.selectionSet && !mergedFieldConfig.optional) {
          dynamicFields[fieldName] = mergedFieldConfig;
        } else {
          staticFields[fieldName] = mergedFieldConfig;
        }
      });

      if (Object.keys(dynamicFields).length) {
        staticTypes[typeName] = { ...mergedTypeConfig, fields: staticFields };
        dynamicTypes[typeName] = { ...mergedTypeConfig, fields: dynamicFields };
      }
    }
  });

  if (Object.keys(dynamicTypes).length) {
    return [
      filterStaticSubschema({ ...subschemaConfig, merge: staticTypes }, dynamicTypes),
      filterDynamicSubschema({ ...subschemaConfig, merge: dynamicTypes }),
    ];
  }

  return [subschemaConfig];
}

function filterStaticSubschema(
  subschemaConfig: SubschemaConfig,
  dynamicTypes: Record<string, MergedTypeConfig>
): SubschemaConfig {
  let schema: GraphQLSchema = subschemaConfig.schema;

  schema = new FilterObjectFields((typeName: string, fieldName: string): boolean => {
    return !(dynamicTypes[typeName] && dynamicTypes[typeName].fields[fieldName]);
  }).transformSchema(schema);

  subschemaConfig.schema = pruneSchema(schema);

  const remainingTypes = subschemaConfig.schema.getTypeMap();
  Object.keys(subschemaConfig.merge).forEach(mergeType => {
    if (!remainingTypes[mergeType]) {
      delete subschemaConfig.merge[mergeType];
    }
  });

  if (!Object.keys(subschemaConfig.merge).length) {
    delete subschemaConfig.merge;
  }

  return subschemaConfig;
}

function filterDynamicSubschema(subschemaConfig: SubschemaConfig): SubschemaConfig {
  const rootFields: Record<string, boolean> = {};

  Object.keys(subschemaConfig.merge).forEach(typeName => {
    rootFields[subschemaConfig.merge[typeName].fieldName] = true;
  });

  const schema: GraphQLSchema = filterSchema({
    schema: subschemaConfig.schema,
    rootFieldFilter: (operation: string, fieldName: string) => !!(operation === 'Query' && rootFields[fieldName]),
    fieldFilter: (typeName: string, fieldName: string) =>
      !!(subschemaConfig.merge[typeName] && subschemaConfig.merge[typeName].fields[fieldName]),
  });

  subschemaConfig.schema = pruneSchema(schema);
  return subschemaConfig;
}
