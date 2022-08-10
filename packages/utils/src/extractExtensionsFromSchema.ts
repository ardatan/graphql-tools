import { mapSchema } from './mapSchema.js';
import { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { EnumTypeExtensions, InputTypeExtensions, ObjectTypeExtensions, SchemaExtensions } from './types.js';
import { MapperKind } from './Interfaces.js';

export function extractExtensionsFromSchema(schema: GraphQLSchema): SchemaExtensions {
  const result: SchemaExtensions = {
    schemaExtensions: schema.extensions || {},
    types: {},
  };

  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      result.types[type.name] = { fields: {}, type: 'object', extensions: type.extensions || {} };
      return type;
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      result.types[type.name] = { fields: {}, type: 'interface', extensions: type.extensions || {} };
      return type;
    },
    [MapperKind.FIELD]: (field, fieldName, typeName) => {
      (result.types[typeName] as ObjectTypeExtensions).fields[fieldName] = {
        arguments: {},
        extensions: field.extensions || {},
      };
      const args = (field as GraphQLFieldConfig<any, any>).args;
      if (args != null) {
        for (const argName in args) {
          (result.types[typeName] as ObjectTypeExtensions).fields[fieldName].arguments[argName] =
            args[argName].extensions || {};
        }
      }
      return field;
    },
    [MapperKind.ENUM_TYPE]: type => {
      result.types[type.name] = { values: {}, type: 'enum', extensions: type.extensions || {} };
      return type;
    },
    [MapperKind.ENUM_VALUE]: (value, typeName, _schema, valueName) => {
      (result.types[typeName] as EnumTypeExtensions).values[valueName] = value.extensions || {};
      return value;
    },
    [MapperKind.SCALAR_TYPE]: type => {
      result.types[type.name] = { type: 'scalar', extensions: type.extensions || {} };
      return type;
    },
    [MapperKind.UNION_TYPE]: type => {
      result.types[type.name] = { type: 'union', extensions: type.extensions || {} };
      return type;
    },
    [MapperKind.INPUT_OBJECT_TYPE]: type => {
      result.types[type.name] = { fields: {}, type: 'input', extensions: type.extensions || {} };
      return type;
    },
    [MapperKind.INPUT_OBJECT_FIELD]: (field, fieldName, typeName) => {
      (result.types[typeName] as InputTypeExtensions).fields[fieldName] = {
        extensions: field.extensions || {},
      };
      return field;
    },
  });

  return result;
}
