import {
  GraphQLEnumType,
  GraphQLInputType,
  GraphQLScalarType,
  getNullableType,
  isLeafType,
  isListType,
  isInputObjectType,
} from 'graphql';

import keyValMap from './keyValMap';

type InputValueTransformer = (
  type: GraphQLEnumType | GraphQLScalarType,
  originalValue: any,
) => any;

export function transformInputValue(
  type: GraphQLInputType,
  value: any,
  transformer: InputValueTransformer,
): any {
  if (value == null) {
    return value;
  }

  const nullableType = getNullableType(type);

  if (isLeafType(nullableType)) {
    return transformer(nullableType, value);
  } else if (isListType(nullableType)) {
    return value.map((listMember: any) =>
      transformInputValue(nullableType.ofType, listMember, transformer),
    );
  } else if (isInputObjectType(nullableType)) {
    const fields = nullableType.getFields();
    return keyValMap(
      Object.keys(value),
      (key) => key,
      (key) => transformInputValue(fields[key].type, value[key], transformer),
    );
  }

  // unreachable, no other possible return value
}

export function serializeInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => t.serialize(v));
}

export function parseInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => t.parseValue(v));
}

export function parseInputValueLiteral(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => t.parseLiteral(v, {}));
}
