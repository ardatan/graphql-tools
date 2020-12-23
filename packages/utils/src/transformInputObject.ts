import {
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInputField,
  getNullableType,
  isLeafType,
  isListType,
  isInputObjectType,
} from 'graphql';

type InputObjectTransformer = (type: GraphQLInputObjectType, field: GraphQLInputField) => any;

export function transformInputObject(type: GraphQLInputType, variables: any, transformer: InputObjectTransformer): any {
  if (variables == null) {
    return variables;
  }
  const nullableType = getNullableType(type);

  if (isLeafType(nullableType)) {
    return variables
  } else if (isListType(nullableType)) {
    return variables.map((listMember: any) => transformInputObject(nullableType.ofType, listMember, transformer));
  } else if (isInputObjectType(nullableType)) {
    const fields = nullableType.getFields();
    const newValue = {};
    Object.keys(variables).forEach(key => {
      const field = fields[key];
      if (field != null) {
        const newFieldName = transformer (nullableType, field)
        newValue[newFieldName] = transformInputObject (field.type, variables[key], transformer)
      }
    });
    return newValue;
  }

  // unreachable, no other possible return value
}
