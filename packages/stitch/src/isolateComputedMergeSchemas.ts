import { SubschemaConfig, MergedTypeConfig, MergedFieldConfig } from '@graphql-tools/delegate';

import {
  filterSchema,
  pruneSchema,
  valueMatchesCriteria,
  getArgumentValues,
  getImplementingTypes,
  mapSchema,
  MapperKind,
} from '@graphql-tools/utils';

import { GraphQLObjectType, GraphQLInterfaceType, DirectiveNode } from 'graphql';

const requiresSelectionSet = /^requires +(\{.+\})$/;

function applyComputationsFromSDL(subschemaConfig: SubschemaConfig): SubschemaConfig {
  subschemaConfig.schema = mapSchema(subschemaConfig.schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const mergeTypeConfig = subschemaConfig.merge[typeName];

      if (
        mergeTypeConfig &&
        fieldConfig.deprecationReason &&
        valueMatchesCriteria(fieldConfig.deprecationReason.trim(), requiresSelectionSet)
      ) {
        mergeTypeConfig.fields = mergeTypeConfig.fields || {};
        mergeTypeConfig.fields[fieldName] = mergeTypeConfig.fields[fieldName] || {};

        const mergeFieldConfig = mergeTypeConfig.fields[fieldName];
        mergeFieldConfig.selectionSet =
          mergeFieldConfig.selectionSet || fieldConfig.deprecationReason.trim().match(requiresSelectionSet)[1];
        mergeFieldConfig.isolate = true;

        const directives = fieldConfig.astNode.directives.filter((dir: DirectiveNode) => {
          const directiveDef = subschemaConfig.schema.getDirective(dir.name.value);
          const directiveValue = directiveDef ? getArgumentValues(directiveDef, dir) : undefined;
          return dir.name.value === 'deprecated' && directiveValue.reason === fieldConfig.deprecationReason;
        });

        fieldConfig = { ...fieldConfig, astNode: { ...fieldConfig.astNode, directives } };
        delete fieldConfig.deprecationReason;
      }

      return fieldConfig;
    },
  });
  return subschemaConfig;
}

export function splitFieldsFromSubschemaConfig(subschemaConfig: SubschemaConfig): Array<SubschemaConfig> {
  const staticTypes: Record<string, MergedTypeConfig> = {};
  const computedTypes: Record<string, MergedTypeConfig> = {};

  subschemaConfig = applyComputationsFromSDL(subschemaConfig);
  Object.keys(subschemaConfig.merge).forEach((typeName: string) => {
    const mergedTypeConfig: MergedTypeConfig = subschemaConfig.merge[typeName];
    staticTypes[typeName] = mergedTypeConfig;

    if (mergedTypeConfig.fields) {
      const staticFields: Record<string, MergedFieldConfig> = {};
      const computedFields: Record<string, MergedFieldConfig> = {};

      Object.keys(mergedTypeConfig.fields).forEach((fieldName: string) => {
        const mergedFieldConfig = mergedTypeConfig.fields[fieldName];

        if (mergedFieldConfig.selectionSet && mergedFieldConfig.isolate) {
          computedFields[fieldName] = mergedFieldConfig;
        } else {
          staticFields[fieldName] = mergedFieldConfig;
        }
        delete mergedFieldConfig.isolate;
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
    const endpoint = subschemaConfig.endpoint || {
      rootValue: subschemaConfig.rootValue,
      executor: subschemaConfig.executor,
      subscriber: subschemaConfig.subscriber,
      batch: subschemaConfig.batch,
      batchingOptions: subschemaConfig.batchingOptions,
    };
    return [
      filterComputedSubschema({ ...subschemaConfig, endpoint, merge: computedTypes }),
      filterStaticSubschema({ ...subschemaConfig, endpoint, merge: staticTypes }, computedTypes),
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
