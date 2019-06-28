import {
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLScalarTypeConfig
} from 'graphql';
import { Transform } from './transforms';
import { visitSchema, VisitSchemaKind } from './visitSchema';

export default class AddEnumAndScalarResolvers implements Transform {
  private enumValueMap: object;
  private scalarTypeMap: object;

  constructor(enumValueMap: object, scalarTypeMap: object) {
    this.enumValueMap = enumValueMap;
    this.scalarTypeMap = scalarTypeMap;
  }

  public transformSchema(schema: GraphQLSchema): GraphQLSchema {
    const { enumValueMap, scalarTypeMap } = this;
    const enumTypeMap = Object.create(null);

    if (!Object.keys(enumValueMap).length && !Object.keys(scalarTypeMap).length) {
      return schema;
    }

    // Build enum types from the resolver map.
    Object.keys(enumValueMap).forEach(typeName => {
      const enumType: GraphQLEnumType = schema.getType(typeName) as GraphQLEnumType;
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

        enumTypeMap[typeName] =  new GraphQLEnumType({
          name: enumType.name,
          description: enumType.description,
          astNode: enumType.astNode,
          values: newValues,
        });
      }
    });

    //Build scalar types from resolver map (if necessary, see below).
    Object.keys(scalarTypeMap).forEach(typeName => {
      const resolverValue = scalarTypeMap[typeName];

      // Below is necessary as legacy code for scalar type specification allowed
      // hardcoding within the resolver an object with fields '__serialize',
      // '__parse', and '__parseLiteral', see examples in testMocking.ts.
      if (!(resolverValue instanceof GraphQLScalarType)) {
        const scalarType: GraphQLScalarType = schema.getType(typeName) as GraphQLScalarType;

        const scalarTypeConfig = {};
        Object.keys(resolverValue).forEach(key => {
          if (key.startsWith('__')) {
            scalarTypeConfig[key.substring(2)] = resolverValue[key];
          } else {
            scalarTypeConfig[key] = resolverValue[key];
          }
        });

        scalarTypeMap[typeName] = new GraphQLScalarType({
          ...scalarType,
          ...scalarTypeConfig
        } as GraphQLScalarTypeConfig<any, any>);
      }
    });

    // type recreation within visitSchema will automatically adjust default
    // values on fields.
    const transformedSchema = visitSchema(schema, {
      [VisitSchemaKind.SCALAR_TYPE](type: GraphQLScalarType) {
        return scalarTypeMap[type.name];
      },
      [VisitSchemaKind.ENUM_TYPE](type: GraphQLEnumType) {
        return enumTypeMap[type.name];      },
    });

    return transformedSchema;
  }
}
