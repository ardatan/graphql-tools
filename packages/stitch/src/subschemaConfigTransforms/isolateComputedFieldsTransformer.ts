import {
  getNamedType,
  GraphQLNamedOutputType,
  GraphQLObjectType,
  GraphQLSchema,
  isCompositeType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { MergedFieldConfig, MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import {
  collectFields,
  filterSchema,
  getImplementingTypes,
  parseSelectionSet,
  pruneSchema,
} from '@graphql-tools/utils';
import { FilterTypes, TransformCompositeFields } from '@graphql-tools/wrap';

interface ComputedTypeConfig<K = any, V = any, TContext = Record<string, any>>
  extends MergedTypeConfig<K, V, TContext> {
  keyFieldNames: string[];
}

export function isolateComputedFieldsTransformer(
  subschemaConfig: SubschemaConfig,
): Array<SubschemaConfig> {
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
          throw new Error(
            `A selectionSet is required for computed field "${typeName}.${fieldName}"`,
          );
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
          const returnTypes: GraphQLNamedOutputType[] = [returnType];

          // for interfaces and unions the implementations/members need to be handled as well
          if (isInterfaceType(returnType)) {
            returnTypes.push(
              ...getImplementingTypes(returnType.name, subschemaConfig.schema).map(
                name => subschemaConfig.schema.getType(name)! as GraphQLNamedOutputType,
              ),
            );
          } else if (isUnionType(returnType)) {
            returnTypes.push(...returnType.getTypes());
          }

          for (const type of returnTypes) {
            const returnTypeMergeConfig = subschemaConfig.merge[type.name];

            if (isObjectType(type)) {
              if (returnTypeMergeConfig?.selectionSet) {
                // this is a merged type, include the selection set
                // TODO: how to handle entryPoints
                const keyFieldNames: string[] = [];
                if (isObjectType(type)) {
                  const parsedSelectionSet = parseSelectionSet(returnTypeMergeConfig.selectionSet!);
                  const keyFields = collectFields(
                    subschemaConfig.schema,
                    {},
                    {},
                    type,
                    parsedSelectionSet,
                  );
                  keyFieldNames.push(...Array.from(keyFields.fields.keys()));
                }

                isolatedSchemaTypes[type.name] = {
                  ...returnTypeMergeConfig,
                  keyFieldNames,
                  fields: {
                    ...(isolatedSchemaTypes[type.name]?.fields ?? {}),
                  },
                };
              } else if (!returnTypeMergeConfig) {
                // this is an unmerged type, add all fields to the isolated schema
                const fields = isUnionType(type) ? {} : type.getFields();

                isolatedSchemaTypes[type.name] = {
                  keyFieldNames: [],
                  fields: {
                    ...(isolatedSchemaTypes[type.name]?.fields ?? {}),
                    ...Object.fromEntries(Object.keys(fields).map(f => [f, {}])),
                  },
                  canonical: true,
                };
              }
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

function _createCompositeFieldFilter(schema: GraphQLSchema) {
  // create TransformCompositeFields that will remove any field not in schema,
  const filteredFields: Record<string, Record<string, boolean>> = {};
  for (const typeName in schema.getTypeMap()) {
    const type = schema.getType(typeName);
    if (isObjectType(type) || isInterfaceType(type)) {
      filteredFields[typeName] = { __typename: true };
      const fieldMap = type.getFields();
      for (const fieldName in fieldMap) {
        filteredFields[typeName][fieldName] = true;
      }
    }
  }
  return new TransformCompositeFields(
    (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null),
    (typeName, fieldName) => (filteredFields[typeName]?.[fieldName] ? undefined : null),
  );
}

function filterBaseSubschema(
  subschemaConfig: SubschemaConfig,
  isolatedSchemaTypes: Record<string, ComputedTypeConfig>,
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
          implementingTypeName => isolatedSchemaTypes[implementingTypeName]?.fields?.[fieldName],
        );
      },
    }),
  );

  const filteredSubschema = {
    ...subschemaConfig,
    merge: subschemaConfig.merge
      ? {
          ...subschemaConfig.merge,
        }
      : undefined,
    transforms: (subschemaConfig.transforms ?? []).concat([
      _createCompositeFieldFilter(filteredSchema),
      new FilterTypes( // filter out empty types
        type =>
          (!isObjectType(type) && !isInterfaceType(type)) ||
          Object.keys(type.getFields()).length > 0,
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

  function listReachableTypesToIsolate(
    subschemaConfig: SubschemaConfig,
    type: GraphQLNamedOutputType,
    typeNames?: string[],
  ) {
    typeNames = typeNames || [];

    if (isScalarType(type)) {
      return typeNames;
    } else if (
      (isObjectType(type) || isInterfaceType(type)) &&
      subschemaConfig.merge &&
      subschemaConfig.merge[type.name] &&
      subschemaConfig.merge[type.name].selectionSet
    ) {
      // this is a merged type, no need to descend further
      if (!typeNames.includes(type.name)) {
        typeNames.push(type.name);
      }
      return typeNames;
    } else if (isCompositeType(type)) {
      if (!typeNames.includes(type.name)) {
        typeNames.push(type.name);
      }

      // descent into all field types potentially via interfaces implementations/unions members
      const types: GraphQLObjectType[] = [];
      if (isObjectType(type)) {
        types.push(type);
      } else if (isInterfaceType(type)) {
        types.push(
          ...getImplementingTypes(type.name, subschemaConfig.schema).map(
            name => subschemaConfig.schema.getType(name)! as GraphQLObjectType,
          ),
        );
      } else if (isUnionType(type)) {
        types.push(...type.getTypes());
      }

      for (const type of types) {
        if (!typeNames.includes(type.name)) {
          typeNames.push(type.name);
        }

        for (const f of Object.values(type.getFields())) {
          const fieldType = getNamedType(f.type);
          if (!typeNames.includes(fieldType.name) && isCompositeType(fieldType)) {
            typeNames.push(...listReachableTypesToIsolate(subschemaConfig, fieldType));
          }
        }
      }

      return typeNames;
    } else {
      // TODO: Unions
      return typeNames;
    }
  }

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
      listReachableTypesToIsolate(subschemaConfig, fieldType).forEach(tn => {
        computedFieldTypes[tn] = true;
      });
    }
  }

  const interfaceFields: Record<string, Record<string, boolean>> = {};
  for (const typeName in subschemaConfig.merge) {
    const type = subschemaConfig.schema.getType(typeName);
    if (!type || isObjectType(type)) {
      if (!type || !('getInterfaces' in type)) {
        throw new Error(`${typeName} expected to have 'getInterfaces' method`);
      }
      for (const int of type.getInterfaces()) {
        const intType = subschemaConfig.schema.getType(int.name);
        if (!intType || !('getFields' in intType)) {
          throw new Error(`${int.name} expected to have 'getFields' method`);
        }
        for (const intFieldName in intType.getFields()) {
          if (
            subschemaConfig.merge[typeName].fields?.[intFieldName] ||
            subschemaConfig.merge[typeName].keyFieldNames.includes(intFieldName)
          ) {
            interfaceFields[int.name] = interfaceFields[int.name] || {};
            interfaceFields[int.name][intFieldName] = true;
          }
        }
      }
    }
  }

  const filteredSchema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      rootFieldFilter: (operation, fieldName, config) =>
        operation === 'Query' &&
        (rootFields[fieldName] != null || computedFieldTypes[getNamedType(config.type).name]),
      objectFieldFilter: (typeName, fieldName) =>
        subschemaConfig.merge[typeName]?.fields?.[fieldName] != null ||
        (subschemaConfig.merge[typeName]?.keyFieldNames ?? []).includes(fieldName),
      interfaceFieldFilter: (typeName, fieldName) => interfaceFields[typeName]?.[fieldName] != null,
    }),
    { skipPruning: typ => computedFieldTypes[typ.name] != null },
  );

  const merge = Object.fromEntries(
    // get rid of keyFieldNames again
    Object.entries(subschemaConfig.merge).map(([typeName, { keyFieldNames, ...config }]) => [
      typeName,
      config,
    ]),
  );

  return {
    ...subschemaConfig,
    merge,
    transforms: (subschemaConfig.transforms ?? []).concat([
      _createCompositeFieldFilter(filteredSchema),
      new FilterTypes( // filter out empty types
        type =>
          (!isObjectType(type) && !isInterfaceType(type)) ||
          Object.keys(type.getFields()).length > 0,
      ),
    ]),
  };
}
