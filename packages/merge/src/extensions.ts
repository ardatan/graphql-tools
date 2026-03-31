import { GraphQLEnumType, GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  asArray,
  ExtensionsObject,
  Maybe,
  mergeDeep,
  SchemaExtensions,
} from '@graphql-tools/utils';

export { extractExtensionsFromSchema } from '@graphql-tools/utils';

export function mergeExtensions(extensions: SchemaExtensions[]): SchemaExtensions {
  return mergeDeep(extensions, false, true);
}

function applyExtensionObject(
  obj: Maybe<{ extensions: Maybe<Readonly<Record<string, any>>> }>,
  extensions: ExtensionsObject,
) {
  if (!obj || !extensions || extensions === obj.extensions) {
    return;
  }
  if (!obj.extensions) {
    obj.extensions = extensions;
    return;
  }
  const existingDirectives = obj.extensions['directives'];
  const newDirectives = extensions['directives'];
  if (existingDirectives && newDirectives) {
    for (const directiveName in newDirectives) {
      const existingDirective = existingDirectives[directiveName];
      if (existingDirective) {
        existingDirectives[directiveName] = asArray(existingDirective).concat(
          asArray(newDirectives[directiveName]),
        );
      } else {
        existingDirectives[directiveName] = newDirectives[directiveName];
      }
    }
  }
  obj.extensions = mergeDeep([obj.extensions, extensions], false, true);
  if (existingDirectives) {
    // @ts-expect-error - we need to restore the directives, as they are merged in a special way
    obj.extensions['directives'] = existingDirectives;
  }
}

export function applyExtensions(
  schema: GraphQLSchema,
  extensions: SchemaExtensions,
): GraphQLSchema {
  applyExtensionObject(schema, extensions.schemaExtensions);

  for (const [typeName, data] of Object.entries(extensions.types || {})) {
    const type = schema.getType(typeName);

    if (type) {
      applyExtensionObject(type, data.extensions);

      if (data.type === 'object' || data.type === 'interface') {
        for (const [fieldName, fieldData] of Object.entries(data.fields)) {
          const field = (type as GraphQLObjectType).getFields()[fieldName];

          if (field) {
            applyExtensionObject(field, fieldData.extensions);

            for (const [arg, argData] of Object.entries(fieldData.arguments)) {
              applyExtensionObject(
                field.args.find(a => a.name === arg),
                argData,
              );
            }
          }
        }
      } else if (data.type === 'input') {
        for (const [fieldName, fieldData] of Object.entries(data.fields)) {
          const field = (type as GraphQLObjectType).getFields()[fieldName];
          applyExtensionObject(field, fieldData.extensions);
        }
      } else if (data.type === 'enum') {
        for (const [valueName, valueData] of Object.entries(data.values)) {
          const value = (type as GraphQLEnumType).getValue(valueName);
          applyExtensionObject(value, valueData);
        }
      }
    }
  }

  return schema;
}
