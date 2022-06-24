import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { cloneSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';

import { SubschemaConfigTransform } from '../types.js';

export function computedDirectiveTransformer(computedDirectiveName: string): SubschemaConfigTransform {
  return (subschemaConfig: SubschemaConfig): SubschemaConfig => {
    const newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);

    mapSchema(subschemaConfig.schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
        const mergeTypeConfig = newSubschemaConfig.merge?.[typeName];

        if (mergeTypeConfig == null) {
          return undefined;
        }

        const computed = getDirective(schema, fieldConfig, computedDirectiveName)?.[0];

        if (computed == null) {
          return undefined;
        }

        const selectionSet = computed['fields'] != null ? `{ ${computed['fields']} }` : computed['selectionSet'];

        if (selectionSet == null) {
          return undefined;
        }

        mergeTypeConfig.fields = mergeTypeConfig.fields ?? {};
        mergeTypeConfig.fields[fieldName] = mergeTypeConfig.fields[fieldName] ?? {};

        const mergeFieldConfig = mergeTypeConfig.fields[fieldName];
        mergeFieldConfig.selectionSet = mergeFieldConfig.selectionSet ?? selectionSet;
        mergeFieldConfig.computed = true;

        return undefined;
      },
    });

    return newSubschemaConfig;
  };
}
