import { GraphQLObjectType, GraphQLInterfaceType, isObjectType, isInterfaceType } from 'graphql';

import { SubschemaConfig, MergedTypeConfig, MergedFieldConfig } from '@graphql-tools/delegate';

import { getImplementingTypes, pruneSchema, filterSchema } from '@graphql-tools/utils';

import { TransformCompositeFields } from '@graphql-tools/wrap';

export function isolateComputedFields(subschemaConfig: SubschemaConfig): Array<SubschemaConfig> {
  const baseSchemaTypes: Record<string, MergedTypeConfig> = {};
  const isolatedSchemaTypes: Record<string, MergedTypeConfig> = {};

  if (subschemaConfig.merge == null) {
    return [subschemaConfig];
  }

  Object.keys(subschemaConfig.merge).forEach((typeName: string) => {
    const mergedTypeConfig: MergedTypeConfig = subschemaConfig.merge[typeName];
    baseSchemaTypes[typeName] = mergedTypeConfig;

    if (mergedTypeConfig.computedFields) {
      const baseFields: Record<string, MergedFieldConfig> = {};
      const isolatedFields: Record<string, MergedFieldConfig> = {};

      Object.keys(mergedTypeConfig.computedFields).forEach((fieldName: string) => {
        const mergedFieldConfig = mergedTypeConfig.computedFields[fieldName];

        if (mergedFieldConfig.selectionSet) {
          isolatedFields[fieldName] = mergedFieldConfig;
        } else {
          baseFields[fieldName] = mergedFieldConfig;
        }
      });

      const isolatedFieldCount = Object.keys(isolatedFields).length;
      const objectType = subschemaConfig.schema.getType(typeName) as GraphQLObjectType;

      if (isolatedFieldCount && isolatedFieldCount !== Object.keys(objectType.getFields()).length) {
        baseSchemaTypes[typeName] = {
          ...mergedTypeConfig,
          fields: Object.keys(baseFields).length ? baseFields : undefined,
        };
        isolatedSchemaTypes[typeName] = { ...mergedTypeConfig, fields: isolatedFields };
      }
    }
  });

  if (Object.keys(isolatedSchemaTypes).length) {
    return [
      filterBaseSubschema({ ...subschemaConfig, merge: baseSchemaTypes }, isolatedSchemaTypes),
      filterIsolatedSubschema({ ...subschemaConfig, merge: isolatedSchemaTypes }),
    ];
  }

  return [subschemaConfig];
}

function filterBaseSubschema(
  subschemaConfig: SubschemaConfig,
  isolatedSchemaTypes: Record<string, MergedTypeConfig>
): SubschemaConfig {
  const typesForInterface: Record<string, string[]> = {};
  const filteredSchema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      objectFieldFilter: (typeName, fieldName) => !isolatedSchemaTypes[typeName]?.fields[fieldName],
      interfaceFieldFilter: (typeName, fieldName) => {
        if (!typesForInterface[typeName]) {
          typesForInterface[typeName] = getImplementingTypes(typeName, subschemaConfig.schema);
        }
        return !typesForInterface[typeName].some(
          implementingTypeName => isolatedSchemaTypes[implementingTypeName]?.fields[fieldName]
        );
      },
    })
  );

  const filteredFields: Record<string, Record<string, boolean>> = {};
  Object.keys(filteredSchema.getTypeMap()).forEach(typeName => {
    const type = filteredSchema.getType(typeName);
    if (isObjectType(type) || isInterfaceType(type)) {
      filteredFields[typeName] = {};
      const fieldMap = type.getFields();
      Object.keys(fieldMap).forEach(fieldName => {
        filteredFields[typeName][fieldName] = true;
      });
    }
  });

  const filteredSubschema = {
    ...subschemaConfig,
    merge: subschemaConfig.merge
      ? {
          ...subschemaConfig.merge,
        }
      : undefined,
    transforms: (subschemaConfig.transforms ?? []).concat([
      new TransformCompositeFields(
        (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null),
        (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null)
      ),
    ]),
  };

  const remainingTypes = filteredSchema.getTypeMap();
  Object.keys(filteredSubschema.merge).forEach(mergeType => {
    if (!remainingTypes[mergeType]) {
      delete filteredSubschema.merge[mergeType];
    }
  });

  if (!Object.keys(filteredSubschema.merge).length) {
    delete filteredSubschema.merge;
  }

  return filteredSubschema;
}

function filterIsolatedSubschema(subschemaConfig: SubschemaConfig): SubschemaConfig {
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

  const filteredSchema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      rootFieldFilter: (operation, fieldName) => operation === 'Query' && rootFields[fieldName] != null,
      objectFieldFilter: (typeName, fieldName) => subschemaConfig.merge[typeName]?.fields[fieldName] != null,
      interfaceFieldFilter: (typeName, fieldName) => interfaceFields[typeName]?.[fieldName] != null,
    })
  );

  const filteredFields: Record<string, Record<string, boolean>> = {};
  Object.keys(filteredSchema.getTypeMap()).forEach(typeName => {
    const type = filteredSchema.getType(typeName);
    if (isObjectType(type) || isInterfaceType(type)) {
      filteredFields[typeName] = {};
      const fieldMap = type.getFields();
      Object.keys(fieldMap).forEach(fieldName => {
        filteredFields[typeName][fieldName] = true;
      });
    }
  });

  return {
    ...subschemaConfig,
    transforms: (subschemaConfig.transforms ?? []).concat([
      new TransformCompositeFields(
        (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null),
        (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null)
      ),
    ]),
  };
}
