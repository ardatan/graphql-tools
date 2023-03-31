import { GraphQLObjectType, getNamedType, isObjectType, isInterfaceType, isScalarType, FieldNode } from 'graphql';

import { SubschemaConfig, MergedTypeConfig, MergedFieldConfig } from '@graphql-tools/delegate';

import { getImplementingTypes, pruneSchema, filterSchema, parseSelectionSet } from '@graphql-tools/utils';

import { TransformCompositeFields } from '@graphql-tools/wrap';

interface ComputedTypeConfig<K = any, V = any, TContext = Record<string, any>>
  extends MergedTypeConfig<K, V, TContext> {
  keyFieldNames: string[];
}

export function isolateComputedFieldsTransformer(subschemaConfig: SubschemaConfig): Array<SubschemaConfig> {
  if (subschemaConfig.merge == null) {
    return [subschemaConfig];
  }

  const baseSchemaTypes: Record<string, MergedTypeConfig> = Object.create(null);
  const isolatedSchemaTypes: Record<string, ComputedTypeConfig> = Object.create(null);

  for (const typeName in subschemaConfig.merge) {
    const mergedTypeConfig = subschemaConfig.merge[typeName];
    const objectType = subschemaConfig.schema.getType(typeName) as GraphQLObjectType;

    baseSchemaTypes[typeName] = mergedTypeConfig;

    if (mergedTypeConfig.fields) {
      const baseFields: Record<string, MergedFieldConfig> = Object.create(null);
      const isolatedFields: Record<string, MergedFieldConfig> = Object.create(null);

      for (const fieldName in mergedTypeConfig.fields) {
        const mergedFieldConfig = mergedTypeConfig.fields[fieldName];
        if (mergedFieldConfig.computed && mergedFieldConfig.selectionSet) {
          isolatedFields[fieldName] = mergedFieldConfig;
        } else if (mergedFieldConfig.computed) {
          throw new Error(`A selectionSet is required for computed field "${typeName}.${fieldName}"`);
        } else {
          baseFields[fieldName] = mergedFieldConfig;
        }
      }

      const isolatedFieldCount = Object.keys(isolatedFields).length;

      if (isolatedFieldCount && isolatedFieldCount !== Object.keys(objectType.getFields()).length) {
        baseSchemaTypes[typeName] = {
          ...mergedTypeConfig,
          fields: baseFields,
        };
        isolatedSchemaTypes[typeName] = {
          ...mergedTypeConfig,
          // there might already be key fields
          keyFieldNames: isolatedSchemaTypes[typeName]?.keyFieldNames || [],
          fields: { ...(isolatedSchemaTypes[typeName]?.fields ?? {}), ...isolatedFields },
          canonical: undefined,
        };

        for (const fieldName in isolatedFields) {
          const returnType = getNamedType(objectType.getFields()[fieldName].type);
          // TODO: handle Union, List, NonNull?
          if (isObjectType(returnType) || isInterfaceType(returnType)) {
            const returnTypeMergeConfig = subschemaConfig.merge[returnType.name];

            if (returnTypeMergeConfig?.selectionSet) {
              // this is a merged type, include the selection set
              // TODO: how to handle entryPoints?
              const parsedSelectionSet = parseSelectionSet(returnTypeMergeConfig.selectionSet!);
              const keyFieldNames = parsedSelectionSet.selections.map(s => (s as FieldNode).name.value);

              isolatedSchemaTypes[returnType.name] = {
                ...returnTypeMergeConfig,
                keyFieldNames,
                fields: {
                  ...(isolatedSchemaTypes[returnType.name]?.fields ?? {}),
                },
              };
            } else if (!returnTypeMergeConfig) {
              // this is an unmerged type, add all fields to the isolated schema
              isolatedSchemaTypes[returnType.name] = {
                keyFieldNames: [],
                fields: {
                  ...(isolatedSchemaTypes[returnType.name]?.fields ?? {}),
                  ...Object.fromEntries(Object.keys(returnType.getFields()).map(f => [f, {}])),
                },
                canonical: true,
              };
            }
          }
        }
      }
    }
  }

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
  isolatedSchemaTypes: Record<string, ComputedTypeConfig>
): SubschemaConfig {
  const schema = subschemaConfig.schema;
  const typesForInterface: Record<string, string[]> = {};
  const filteredSchema = pruneSchema(
    filterSchema({
      schema,
      objectFieldFilter: (typeName, fieldName) =>
        !isolatedSchemaTypes[typeName]?.fields?.[fieldName] ||
        (isolatedSchemaTypes[typeName]?.keyFieldNames ?? []).includes(fieldName),
      interfaceFieldFilter: (typeName, fieldName) => {
        if (!typesForInterface[typeName]) {
          typesForInterface[typeName] = getImplementingTypes(typeName, schema);
        }
        return !typesForInterface[typeName].some(
          implementingTypeName => isolatedSchemaTypes[implementingTypeName]?.fields?.[fieldName]
        );
      },
    })
  );

  const filteredFields: Record<string, Record<string, boolean>> = {};
  for (const typeName in filteredSchema.getTypeMap()) {
    const type = filteredSchema.getType(typeName);
    if (isObjectType(type) || isInterfaceType(type)) {
      filteredFields[typeName] = { __typename: true };
      const fieldMap = type.getFields();
      for (const fieldName in fieldMap) {
        filteredFields[typeName][fieldName] = true;
      }
    }
  }

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
  const mergeConfig = filteredSubschema.merge;
  if (mergeConfig) {
    for (const mergeType in mergeConfig) {
      if (!remainingTypes[mergeType]) {
        delete mergeConfig[mergeType];
      }
    }

    if (!Object.keys(mergeConfig).length) {
      delete filteredSubschema.merge;
    }
  }

  return filteredSubschema;
}

type IsolatedSubschemaInput = Exclude<SubschemaConfig, 'merge'> & {
  merge: Record<string, ComputedTypeConfig>;
};

function filterIsolatedSubschema(subschemaConfig: IsolatedSubschemaInput): SubschemaConfig {
  const rootFields: Record<string, boolean> = {};
  const computedFieldTypes: Record<string, boolean> = {}; // contains types of computed fields that have no root field

  for (const typeName in subschemaConfig.merge) {
    const mergedTypeConfig = subschemaConfig.merge[typeName];
    const entryPoints = mergedTypeConfig.entryPoints ?? [mergedTypeConfig];
    for (const entryPoint of entryPoints) {
      if (entryPoint.fieldName != null) {
        rootFields[entryPoint.fieldName] = true;
        if (computedFieldTypes[entryPoint.fieldName]) {
          delete computedFieldTypes[entryPoint.fieldName];
        }
      }
    }
    const computedFields = [
      ...Object.entries(mergedTypeConfig.fields || {})
        .map(([k, v]) => (v.computed ? k : null))
        .filter(fn => fn !== null),
    ].filter(fn => !rootFields[fn!]);

    const type = subschemaConfig.schema.getType(typeName) as GraphQLObjectType;

    for (const fieldName of computedFields) {
      const fieldType = getNamedType(type.getFields()[fieldName!].type);
      if (!isScalarType(fieldType)) {
        computedFieldTypes[fieldType.name] = true;
      }
    }
  }

  const interfaceFields: Record<string, Record<string, boolean>> = {};
  for (const typeName in subschemaConfig.merge) {
    const type = subschemaConfig.schema.getType(typeName);
    if (!type || !('getInterfaces' in type)) {
      throw new Error(`${typeName} expected to have 'getInterfaces' method`);
    }
    for (const int of type.getInterfaces()) {
      const intType = subschemaConfig.schema.getType(int.name);
      if (!intType || !('getFields' in intType)) {
        throw new Error(`${int.name} expected to have 'getFields' method`);
      }
      for (const intFieldName in intType.getFields()) {
        if (subschemaConfig.merge[typeName].fields?.[intFieldName]) {
          interfaceFields[int.name] = interfaceFields[int.name] || {};
          interfaceFields[int.name][intFieldName] = true;
        }
      }
    }
  }

  const filteredSchema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      rootFieldFilter: (operation, fieldName) => operation === 'Query' && rootFields[fieldName] != null,
      objectFieldFilter: (typeName, fieldName) =>
        subschemaConfig.merge[typeName]?.fields?.[fieldName] != null ||
        (subschemaConfig.merge[typeName]?.keyFieldNames ?? []).includes(fieldName),
      interfaceFieldFilter: (typeName, fieldName) => interfaceFields[typeName]?.[fieldName] != null,
    }),
    { skipPruning: typ => computedFieldTypes[typ.name] != null }
  );

  const filteredFields: Record<string, Record<string, boolean>> = {};
  for (const typeName in filteredSchema.getTypeMap()) {
    const type = filteredSchema.getType(typeName);
    if (isObjectType(type) || isInterfaceType(type)) {
      filteredFields[typeName] = { __typename: true };
      const fieldMap = type.getFields();
      for (const fieldName in fieldMap) {
        filteredFields[typeName][fieldName] = true;
      }
    }
  }

  const merge = Object.fromEntries(
    // get rid of keyFieldNames again
    Object.entries(subschemaConfig.merge).map(([typeName, { keyFieldNames, ...config }]) => [typeName, config])
  );

  return {
    ...subschemaConfig,
    merge,
    transforms: (subschemaConfig.transforms ?? []).concat([
      new TransformCompositeFields(
        (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null),
        (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null)
      ),
    ]),
  };
}
