import { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { asArray } from './helpers.js';
import { MapperKind } from './Interfaces.js';
import { mapSchema } from './mapSchema.js';
import {
  EnumTypeExtensions,
  InputTypeExtensions,
  ObjectTypeExtensions,
  SchemaExtensions,
} from './types.js';

function handleDirectiveExtensions(extensions: any, removeDirectives: boolean) {
  extensions = extensions || {};
  const { directives: existingDirectives, ...rest } = extensions;
  const finalExtensions: any = {
    ...rest,
  };
  if (!removeDirectives) {
    if (existingDirectives != null) {
      const directives = {};
      for (const directiveName in existingDirectives) {
        directives[directiveName] = [...asArray(existingDirectives[directiveName])];
      }
      finalExtensions.directives = directives;
    }
  }
  return finalExtensions;
}

export function extractExtensionsFromSchema(
  schema: GraphQLSchema,
  removeDirectives = false,
): SchemaExtensions {
  const result: SchemaExtensions = {
    schemaExtensions: handleDirectiveExtensions(schema.extensions, removeDirectives),
    types: {},
  };

  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: type => {
      result.types[type.name] = {
        fields: {},
        type: 'object',
        extensions: handleDirectiveExtensions(type.extensions, removeDirectives),
      };
      return type;
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      result.types[type.name] = {
        fields: {},
        type: 'interface',
        extensions: handleDirectiveExtensions(type.extensions, removeDirectives),
      };
      return type;
    },
    [MapperKind.FIELD]: (field, fieldName, typeName) => {
      (result.types[typeName] as ObjectTypeExtensions).fields[fieldName] = {
        arguments: {},
        extensions: handleDirectiveExtensions(field.extensions, removeDirectives),
      };
      const args = (field as GraphQLFieldConfig<any, any>).args;
      if (args != null) {
        for (const argName in args) {
          (result.types[typeName] as ObjectTypeExtensions).fields[fieldName].arguments[argName] =
            handleDirectiveExtensions(args[argName].extensions, removeDirectives);
        }
      }
      return field;
    },
    [MapperKind.ENUM_TYPE]: type => {
      result.types[type.name] = {
        values: {},
        type: 'enum',
        extensions: handleDirectiveExtensions(type.extensions, removeDirectives),
      };
      return type;
    },
    [MapperKind.ENUM_VALUE]: (value, typeName, _schema, valueName) => {
      (result.types[typeName] as EnumTypeExtensions).values[valueName] = handleDirectiveExtensions(
        value.extensions,
        removeDirectives,
      );
      return value;
    },
    [MapperKind.SCALAR_TYPE]: type => {
      result.types[type.name] = {
        type: 'scalar',
        extensions: handleDirectiveExtensions(type.extensions, removeDirectives),
      };
      return type;
    },
    [MapperKind.UNION_TYPE]: type => {
      result.types[type.name] = {
        type: 'union',
        extensions: handleDirectiveExtensions(type.extensions, removeDirectives),
      };
      return type;
    },
    [MapperKind.INPUT_OBJECT_TYPE]: type => {
      result.types[type.name] = {
        fields: {},
        type: 'input',
        extensions: handleDirectiveExtensions(type.extensions, removeDirectives),
      };
      return type;
    },
    [MapperKind.INPUT_OBJECT_FIELD]: (field, fieldName, typeName) => {
      (result.types[typeName] as InputTypeExtensions).fields[fieldName] = {
        extensions: handleDirectiveExtensions(field.extensions, removeDirectives),
      };
      return field;
    },
  });

  return result;
}
