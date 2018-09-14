import { GraphQLSchema, GraphQLEnumType } from 'graphql';
import { Transform } from '../transforms/transforms';
import { visitSchema, VisitSchemaKind } from '../transforms/visitSchema';

// Transformation used to modifiy `GraphQLEnumType` values in a schema.
export default class ConvertEnumValues implements Transform {
  // Maps current enum values to their new values.
  // e.g. { Color: { 'RED': '#EA3232' } }
  private enumValueMap: object;

  constructor(enumValueMap: object) {
    this.enumValueMap = enumValueMap;
  }

  // Walk a schema looking for `GraphQLEnumType` types. If found, and
  // matching types have been identified in `this.enumValueMap`, create new
  // `GraphQLEnumType` types using the `this.enumValueMap` specified new
  // values, and return them in the new schema.
  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const { enumValueMap } = this;
    if (!enumValueMap || Object.keys(enumValueMap).length === 0) {
      return schema;
    }

    const transformedSchema = visitSchema(schema, {
      [VisitSchemaKind.ENUM_TYPE](enumType: GraphQLEnumType) {
        const externalToInternalValueMap = enumValueMap[enumType.name];

        if (externalToInternalValueMap) {
          const values = enumType.getValues();
          const newValues = {};
          values.forEach((value) => {
            const newValue =
              Object.keys(externalToInternalValueMap).includes(value.name)
                ? externalToInternalValueMap[value.name]
                : value.name;
            newValues[value.name] = {
              value: newValue,
              deprecationReason: value.deprecationReason,
              description: value.description,
              astNode: value.astNode,
            };
          });

          return new GraphQLEnumType({
            name: enumType.name,
            description: enumType.description,
            astNode: enumType.astNode,
            values: newValues,
          });
        }

        return enumType;
      },
    });

    // `GraphQLEnumType`'s in `graphql-js` 14.x currently use an internal
    // `_valueLookup` map to associate enum values with the enums
    // themselves, when doing an enum lookup. To support `graphql-tools`
    // internal enum values functionality however, we have to change the
    // enum value used as the key in the `_valueLookup` map, to be the new
    // internal only enum value. The code above accomplishes this by
    // creating a new `GraphQLEnumType` with the internal enum value as the
    // enum value. Unfortunately, doing this breaks the way scheam delegation
    // works in `graphql-tools`, since delegation can no longer look an enum
    // up by it's original external facing value. To accommodate this,
    // here we're switching the enums value back to it's original external
    // facing value. So `_valueLookup` stays as we want it - with the new
    // enum value as the key in the lookup map, but the defined enum values
    // array is now back to the way it was, with only external facing values.
    const schemaTypeMap = transformedSchema.getTypeMap();
    Object.keys(enumValueMap).forEach((enumTypeName) => {
      const enumType = schemaTypeMap[enumTypeName];
      if (enumType) {
        (enumType as GraphQLEnumType).getValues().forEach((value) => {
          value.value = value.name;
        });
      }
    });

    return transformedSchema;
  }
}
