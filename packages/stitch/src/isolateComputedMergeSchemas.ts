import { isSubschemaConfig, SubschemaConfig, MergedTypeConfig, MergedFieldConfig } from '@graphql-tools/delegate';

import { filterSchema, pruneSchema, getImplementingTypes } from '@graphql-tools/utils';

import { GraphQLSchema, GraphQLObjectType, GraphQLInterfaceType } from 'graphql';

interface ComputedFieldConfig extends MergedFieldConfig {
  computed?: string;
}

export function isolateComputedMergeSchemas(
  subschemas: Array<GraphQLSchema | SubschemaConfig>
): Array<GraphQLSchema | SubschemaConfig> {
  const mapped: Array<GraphQLSchema | SubschemaConfig> = [];

  subschemas.forEach(schemaLikeObject => {
    if (isSubschemaConfig(schemaLikeObject) && schemaLikeObject.merge) {
      mapped.push(...splitComputedMergeSubschemas(schemaLikeObject as SubschemaConfig));
    } else {
      mapped.push(schemaLikeObject);
    }
  });

  return mapped;
}

function splitComputedMergeSubschemas(subschemaConfig: SubschemaConfig): Array<SubschemaConfig> {
  const staticTypes: Record<string, MergedTypeConfig> = {};
  const computedTypes: Record<string, MergedTypeConfig> = {};

  Object.keys(subschemaConfig.merge).forEach((typeName: string) => {
    const mergedTypeConfig: MergedTypeConfig = subschemaConfig.merge[typeName];
    staticTypes[typeName] = mergedTypeConfig;

    if (mergedTypeConfig.fields) {
      const staticFields: Record<string, MergedFieldConfig> = {};
      const computedFields: Record<string, MergedFieldConfig> = {};

      Object.keys(mergedTypeConfig.fields).forEach((fieldName: string) => {
        const mergedFieldConfig: ComputedFieldConfig = mergedTypeConfig.fields[fieldName] as ComputedFieldConfig;

        if (mergedFieldConfig.selectionSet && mergedFieldConfig.computed) {
          computedFields[fieldName] = mergedFieldConfig;
        } else {
          staticFields[fieldName] = mergedFieldConfig;
        }
        delete mergedFieldConfig.computed;
      });

      const computedFieldCount = Object.keys(computedFields).length;
      const objectType = subschemaConfig.schema.getType(typeName) as GraphQLObjectType;

      if (computedFieldCount && computedFieldCount !== Object.keys(objectType.getFields()).length) {
        staticTypes[typeName] = {
          ...mergedTypeConfig,
          fields: Object.keys(staticFields).length ? staticFields : undefined,
        };
        computedTypes[typeName] = { ...mergedTypeConfig, fields: computedFields };
      }
    }
  });

  if (Object.keys(computedTypes).length) {
    return [
      filterComputedSubschema({ ...subschemaConfig, merge: computedTypes }),
      filterStaticSubschema({ ...subschemaConfig, merge: staticTypes }, computedTypes),
    ];
  }

  return [subschemaConfig];
}

function filterStaticSubschema(
  subschemaConfig: SubschemaConfig,
  computedTypes: Record<string, MergedTypeConfig>
): SubschemaConfig {
  const typesForInterface: Record<string, string[]> = {};
  subschemaConfig.schema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      objectFieldFilter: (typeName: string, fieldName: string) =>
        !(computedTypes[typeName] && computedTypes[typeName].fields[fieldName]),
      interfaceFieldFilter: (typeName: string, fieldName: string) => {
        if (!typesForInterface[typeName]) {
          typesForInterface[typeName] = getImplementingTypes(typeName, subschemaConfig.schema);
        }
        return !typesForInterface[typeName].some(implementingTypeName => {
          return computedTypes[implementingTypeName] && computedTypes[implementingTypeName].fields[fieldName];
        });
      },
    })
  );

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

function filterComputedSubschema(subschemaConfig: SubschemaConfig): SubschemaConfig {
  const rootFields: Record<string, boolean> = {};

  Object.keys(subschemaConfig.merge).forEach(typeName => {
    rootFields[subschemaConfig.merge[typeName].fieldName] = true;
  });

  const interfaceFields: Record<string, Record<string, boolean>> = {};
  Object.keys(subschemaConfig.merge).forEach(typeName => {
    (subschemaConfig.schema.getType(typeName) as GraphQLObjectType).getInterfaces().forEach(int => {
      Object.keys((subschemaConfig.schema.getType(int.name) as GraphQLInterfaceType).getFields()).forEach(
        intFieldName => {
          if (subschemaConfig.merge[typeName].fields[intFieldName]) {
            interfaceFields[int.name] = interfaceFields[int.name] || {};
            interfaceFields[int.name][intFieldName] = true;
          }
        }
      );
    });
  });

  subschemaConfig.schema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      rootFieldFilter: (operation: string, fieldName: string) => !!(operation === 'Query' && rootFields[fieldName]),
      objectFieldFilter: (typeName: string, fieldName: string) =>
        !!(subschemaConfig.merge[typeName] && subschemaConfig.merge[typeName].fields[fieldName]),
      interfaceFieldFilter: (typeName: string, fieldName: string) =>
        !!(interfaceFields[typeName] && interfaceFields[typeName][fieldName]),
    })
  );

  return subschemaConfig;
}
