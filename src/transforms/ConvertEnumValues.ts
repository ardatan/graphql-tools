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
          values.forEach(value => {
            const newValue = Object.keys(externalToInternalValueMap).includes(
              value.name,
            )
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

    return transformedSchema;
  }
}
