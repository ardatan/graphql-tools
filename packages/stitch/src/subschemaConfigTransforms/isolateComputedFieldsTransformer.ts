import {
  getNamedType,
  GraphQLNamedOutputType,
  GraphQLObjectType,
  GraphQLSchema,
  isAbstractType,
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
              const returnTypeSelectionSet = returnTypeMergeConfig?.selectionSet;
              if (returnTypeSelectionSet) {
                // this is a merged type, include the selection set
                const keyFieldNames: string[] = [];
                const parsedSelectionSet = parseSelectionSet(returnTypeSelectionSet);
                const keyFields = collectFields(
                  subschemaConfig.schema,
                  {},
                  {},
                  type,
                  parsedSelectionSet,
                );
                keyFieldNames.push(...Array.from(keyFields.fields.keys()));
                for (const entryPoint of returnTypeMergeConfig.entryPoints ?? []) {
                  if (entryPoint.selectionSet) {
                    const parsedSelectionSet = parseSelectionSet(entryPoint.selectionSet);
                    const keyFields = collectFields(
                      subschemaConfig.schema,
                      {},
                      {},
                      type,
                      parsedSelectionSet,
                    );
                    keyFieldNames.push(...Array.from(keyFields.fields.keys()));
                  }
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
                const fields: Record<string, MergedFieldConfig> = {
                  ...isolatedSchemaTypes[type.name]?.fields,
                };
                if (isAbstractType(type)) {
                  for (const implementingType of getImplementingTypes(
                    type.name,
                    subschemaConfig.schema,
                  )) {
                    const implementingTypeFields = isolatedSchemaTypes[implementingType]?.fields;
                    if (implementingTypeFields) {
                      for (const fieldName in implementingTypeFields) {
                        if (implementingTypeFields[fieldName]) {
                          fields[fieldName] = {
                            ...implementingTypeFields[fieldName],
                            ...fields[fieldName],
                          };
                        }
                      }
                    }
                  }
                }
                if (isInterfaceType(type) || isObjectType(type)) {
                  for (const fieldName in type.getFields()) {
                    if (!fields[fieldName]) {
                      fields[fieldName] = {};
                    }
                  }
                }
                isolatedSchemaTypes[type.name] = {
                  keyFieldNames: [],
                  fields,
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

function isIsolatedField(
  typeName: string,
  fieldName: string,
  isolatedSchemaTypes: Record<string, ComputedTypeConfig>,
): boolean {
  const fieldConfig = isolatedSchemaTypes[typeName]?.fields?.[fieldName];
  if (fieldConfig) {
    return true;
  }
  return false;
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
        !isIsolatedField(typeName, fieldName, isolatedSchemaTypes) ||
        (isolatedSchemaTypes[typeName]?.keyFieldNames ?? []).includes(fieldName),
      interfaceFieldFilter: (typeName, fieldName) => {
        if (!typesForInterface[typeName]) {
          typesForInterface[typeName] = getImplementingTypes(typeName, schema);
        }
        const isIsolatedFieldName = typesForInterface[typeName].some(implementingTypeName =>
          isIsolatedField(implementingTypeName, fieldName, isolatedSchemaTypes),
        );
        return (
          !isIsolatedFieldName ||
          (isolatedSchemaTypes[typeName]?.keyFieldNames ?? []).includes(fieldName)
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
    typeNames = new Set<string>(),
  ) {
    if (isScalarType(type)) {
      return typeNames;
    } else if (
      (isObjectType(type) || isInterfaceType(type)) &&
      subschemaConfig.merge &&
      subschemaConfig.merge[type.name] &&
      subschemaConfig.merge[type.name].selectionSet
    ) {
      // this is a merged type, no need to descend further
      typeNames.add(type.name);
      return typeNames;
    } else if (isCompositeType(type)) {
      typeNames.add(type.name);

      // descent into all field types potentially via interfaces implementations/unions members
      const types = new Set<GraphQLObjectType>();
      if (isObjectType(type)) {
        types.add(type);
      } else if (isInterfaceType(type)) {
        getImplementingTypes(type.name, subschemaConfig.schema).forEach(name =>
          types.add(subschemaConfig.schema.getType(name)! as GraphQLObjectType),
        );
      } else if (isUnionType(type)) {
        type.getTypes().forEach(t => types.add(t));
      }

      for (const type of types) {
        typeNames.add(type.name);

        for (const f of Object.values(type.getFields())) {
          const fieldType = getNamedType(f.type);
          if (!typeNames.has(fieldType.name) && isCompositeType(fieldType)) {
            listReachableTypesToIsolate(subschemaConfig, fieldType, typeNames);
          }
        }
      }

      return typeNames;
    } else if (isUnionType(type)) {
      typeNames.add(type.name);
      type.getTypes().forEach(t => listReachableTypesToIsolate(subschemaConfig, t, typeNames));
      return typeNames;
    } else {
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
      computedFieldTypes[fieldType.name] = true;
      listReachableTypesToIsolate(subschemaConfig, fieldType).forEach(tn => {
        computedFieldTypes[tn] = true;
      });
    }
  }

  const typesForInterface: Record<string, string[]> = {};
  const filteredSchema = pruneSchema(
    filterSchema({
      schema: subschemaConfig.schema,
      rootFieldFilter: (_, fieldName, config) => {
        if (rootFields[fieldName]) {
          return true;
        }
        const returnType = getNamedType(config.type);
        if (isAbstractType(returnType)) {
          const typesForInterface = getImplementingTypes(returnType.name, subschemaConfig.schema);
          return typesForInterface.some(t => computedFieldTypes[t] != null);
        }
        return computedFieldTypes[returnType.name] != null;
      },
      objectFieldFilter: (typeName, fieldName) =>
        subschemaConfig.merge[typeName] == null ||
        subschemaConfig.merge[typeName]?.fields?.[fieldName] != null ||
        (subschemaConfig.merge[typeName]?.keyFieldNames ?? []).includes(fieldName),
      interfaceFieldFilter: (typeName, fieldName) => {
        if (!typesForInterface[typeName]) {
          typesForInterface[typeName] = getImplementingTypes(typeName, subschemaConfig.schema);
        }
        const isIsolatedFieldName = typesForInterface[typeName].some(implementingTypeName =>
          isIsolatedField(implementingTypeName, fieldName, subschemaConfig.merge),
        );
        return (
          isIsolatedFieldName ||
          (subschemaConfig.merge[typeName]?.keyFieldNames ?? []).includes(fieldName)
        );
      },
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

  const filteredSubschema = {
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

  return filteredSubschema;
}
