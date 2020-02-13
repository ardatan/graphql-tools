import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLScalarType,
  getNullableType,
} from 'graphql';

type InputValueTransformer = (type: GraphQLEnumType | GraphQLScalarType, originalValue: any) => any;

export function transformInputValue(type: GraphQLInputType, value: any, transformer: InputValueTransformer) {
  if (value == null) {
    return value;
  }

  const nullableType = getNullableType(type);

  if (nullableType instanceof GraphQLEnumType || nullableType instanceof GraphQLScalarType) {
    return transformer(nullableType, value);
  } else if (nullableType instanceof GraphQLList) {
    return value.map((listMember: any) => transformInputValue(nullableType.ofType, listMember, transformer));
  } else if (nullableType instanceof GraphQLInputObjectType) {
    const fields = nullableType.getFields();
    const newValue = {};
    Object.keys(value).forEach(key => {
      newValue[key] = transformInputValue(fields[key].type, value[key], transformer);
    });
    return newValue;
  }

  // unreachable, no other possible return value
}

export function serializeInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(
    type,
    value,
    (t, v) => t.serialize(v)
  );
}

export function parseInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(
    type,
    value,
    (t, v) => t.parseValue(v)
  );
}

export function parseInputValueLiteral(type: GraphQLInputType, value: any) {
  return transformInputValue(
    type,
    value,
    (t, v) => t.parseLiteral(v, {})
  );
}
