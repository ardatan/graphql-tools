import { cloneSubschemaConfig, SubschemaConfig } from '@graphql-tools/delegate';

export function splitMergedTypeAccessTransformer(subschemaConfig: SubschemaConfig): Array<SubschemaConfig> {
  if (!subschemaConfig.merge) return [subschemaConfig];

  const maxAccessors = Object.values(subschemaConfig.merge).reduce((max: number, mergedTypeConfig) => {
    return Math.max(max, mergedTypeConfig?.accessors?.length ?? 0);
  }, 0);

  if (maxAccessors === 0) return [subschemaConfig];

  const subschemaPermutations = [];

  for (let i = 0; i < maxAccessors; i += 1) {
    const subschemaPermutation = cloneSubschemaConfig(subschemaConfig);
    const mergedTypesCopy = subschemaPermutation.merge;

    if (i > 0) {
      subschemaPermutation.merge = Object.create(null);
    }

    Object.keys(mergedTypesCopy).forEach(typeName => {
      const mergedTypeConfig = mergedTypesCopy[typeName];
      const mergedTypeAccessor = mergedTypeConfig?.accessors?.[i];

      if (mergedTypeAccessor) {
        if (mergedTypeConfig.selectionSet || mergedTypeConfig.fieldName) {
          throw new Error(`Merged type ${typeName} may not define both accessors and a selectionSet or fieldName`);
        }

        Object.assign(mergedTypeConfig, mergedTypeAccessor);
        delete mergedTypeConfig.accessors;

        if (i > 0) {
          delete mergedTypeConfig.canonical;
          if (mergedTypeConfig.fields != null) {
            Object.values(mergedTypeConfig.fields).forEach(mergedFieldConfig => {
              delete mergedFieldConfig.canonical;
            });
          }
        }

        subschemaPermutation.merge[typeName] = mergedTypeConfig;
      }
    });

    subschemaPermutations.push(subschemaPermutation);
  }

  return subschemaPermutations;
}
