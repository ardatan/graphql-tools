import { SubschemaConfig } from './types';

export function isSubschemaConfig(value: any): value is SubschemaConfig {
  return Boolean(value?.schema);
}

export function cloneSubschemaConfig(subschemaConfig: SubschemaConfig): SubschemaConfig {
  const newSubschemaConfig = {
    ...subschemaConfig,
    transforms: subschemaConfig.transforms != null ? [...subschemaConfig.transforms] : undefined,
  };

  if (newSubschemaConfig.merge != null) {
    newSubschemaConfig.merge = { ...subschemaConfig.merge };
    Object.keys(newSubschemaConfig.merge).forEach(typeName => {
      const mergedTypeConfig = (newSubschemaConfig.merge[typeName] = { ...subschemaConfig.merge[typeName] });

      if (mergedTypeConfig.accessors != null) {
        mergedTypeConfig.accessors = mergedTypeConfig.accessors.slice();
      }

      if (mergedTypeConfig.fields != null) {
        const fields = (mergedTypeConfig.fields = { ...mergedTypeConfig.fields });
        Object.keys(fields).forEach(fieldName => {
          fields[fieldName] = { ...fields[fieldName] };
        });
      }
    });
  }

  return newSubschemaConfig;
}
