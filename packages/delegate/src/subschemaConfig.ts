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
      newSubschemaConfig.merge[typeName] = { ...subschemaConfig.merge[typeName] };

      const fields = newSubschemaConfig.merge[typeName].fields;
      if (fields != null) {
        Object.keys(fields).forEach(fieldName => {
          fields[fieldName] = { ...fields[fieldName] };
        });
      }

      const computedFields = newSubschemaConfig.merge[typeName].computedFields;
      if (computedFields != null) {
        Object.keys(computedFields).forEach(fieldName => {
          computedFields[fieldName] = { ...computedFields[fieldName] };
        });
      }
    });
  }

  return newSubschemaConfig;
}
