import { getDirectives, MapperKind, mapSchema } from '@graphql-tools/utils';
import { cloneSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';

import { SubschemaConfigTransform } from '../types';

export function computedDirectiveTransformer(computedDirectiveName: string): SubschemaConfigTransform {
  return (subschemaConfig: SubschemaConfig): SubschemaConfig => {
    const newSubschemaConfig = cloneSubschemaConfig(subschemaConfig);

    mapSchema(subschemaConfig.schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, schema) => {
        const mergeTypeConfig = newSubschemaConfig.merge?.[typeName];

        if (mergeTypeConfig == null) {
          return undefined;
        }

        const computed = getDirectives(schema, fieldConfig)[computedDirectiveName];

        if (computed == null) {
          return undefined;
        }

        const selectionSet = computed.fields != null ? `{ ${computed.fields} }` : computed.selectionSet;

        if (selectionSet == null) {
          return undefined;
        }

        mergeTypeConfig.computedFields = mergeTypeConfig.computedFields ?? {};
        mergeTypeConfig.computedFields[fieldName] = mergeTypeConfig.computedFields[fieldName] ?? {};

        const mergeFieldConfig = mergeTypeConfig.computedFields[fieldName];
        mergeFieldConfig.selectionSet = mergeFieldConfig.selectionSet ?? selectionSet;

        return undefined;
      },
    });

    return newSubschemaConfig;
  };
}
