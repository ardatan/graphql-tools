import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { mapSchema } from './mapSchema';
import { MapperKind, FieldMapper } from './Interfaces';

export function mapSchemaByField(schema: GraphQLSchema, fieldMapper: FieldMapper): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      const config = type.toConfig();

      const originalFieldConfigMap = config.fields;
      const newFieldConfigMap = {};
      Object.keys(originalFieldConfigMap).forEach(fieldName => {
        const originalFieldConfig = originalFieldConfigMap[fieldName];

        const mappedField = fieldMapper([fieldName, originalFieldConfig]);

        if (mappedField === undefined) {
          newFieldConfigMap[fieldName] = originalFieldConfig;
        } else if (mappedField !== null) {
          const [newFieldName, newFieldConfig] = mappedField;
          newFieldConfigMap[newFieldName] = newFieldConfig;
        }
      });

      return new GraphQLObjectType({
        ...config,
        fields: newFieldConfigMap,
      });
    },
  });
}
