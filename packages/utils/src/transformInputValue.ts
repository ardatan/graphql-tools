import {
  getNullableType,
  GraphQLInputType,
  isInputObjectType,
  isLeafType,
  isListType,
} from 'graphql';
import { asArray } from './helpers.js';
import { InputLeafValueTransformer, InputObjectValueTransformer, Maybe } from './types.js';

export function transformInputValue(
  type: GraphQLInputType,
  value: any,
  inputLeafValueTransformer: Maybe<InputLeafValueTransformer> = null,
  inputObjectValueTransformer: Maybe<InputObjectValueTransformer> = null,
): any {
  if (value == null) {
    return value;
  }

  const nullableType = getNullableType(type);

  if (isLeafType(nullableType)) {
    return inputLeafValueTransformer != null
      ? inputLeafValueTransformer(nullableType, value)
      : value;
  } else if (isListType(nullableType)) {
    return asArray(value).map((listMember: any) =>
      transformInputValue(
        nullableType.ofType,
        listMember,
        inputLeafValueTransformer,
        inputObjectValueTransformer,
      ),
    );
  } else if (isInputObjectType(nullableType)) {
    const fields = nullableType.getFields();
    const newValue = {};
    for (const key in value) {
      const field = fields[key];
      if (field != null) {
        newValue[key] = transformInputValue(
          field.type,
          value[key],
          inputLeafValueTransformer,
          inputObjectValueTransformer,
        );
      }
    }
    return inputObjectValueTransformer != null
      ? inputObjectValueTransformer(nullableType, newValue)
      : newValue;
  }

  // unreachable, no other possible return value
}

export function serializeInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => {
    try {
      return t.serialize(v);
    } catch {
      return v;
    }
  });
}

export function parseInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => {
    try {
      return t.parseValue(v);
    } catch {
      return v;
    }
  });
}

export function parseInputValueLiteral(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => t.parseLiteral(v, {}));
}
