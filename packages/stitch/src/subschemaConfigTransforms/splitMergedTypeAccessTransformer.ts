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

    if (i > 0) {
      subschemaPermutation.merge = Object.create(null);
    }

    Object.keys(subschemaConfig.merge).forEach(typeName => {
      const mergedTypeConfig = subschemaConfig.merge[typeName];
      const mergedTypeAccessor = mergedTypeConfig?.accessors?.[i];

      if (mergedTypeAccessor) {
        subschemaPermutation.merge[typeName] = {
          ...mergedTypeConfig,
          ...mergedTypeAccessor,
          accessors: undefined,
        };
      }
    });

    subschemaPermutations.push(subschemaPermutation);
  }

  return subschemaPermutations;
}
