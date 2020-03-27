import { ValueNode, Kind } from 'graphql';

// Similar to the graphql-js function of the same name, slightly simplified:
// https://github.com/graphql/graphql-js/blob/master/src/utilities/valueFromASTUntyped.js
export default function valueFromASTUntyped(valueNode: ValueNode): any {
  switch (valueNode.kind) {
    case Kind.NULL:
      return null;
    case Kind.INT:
      return parseInt(valueNode.value, 10);
    case Kind.FLOAT:
      return parseFloat(valueNode.value);
    case Kind.STRING:
    case Kind.ENUM:
    case Kind.BOOLEAN:
      return valueNode.value;
    case Kind.LIST:
      return valueNode.values.map(valueFromASTUntyped);
    case Kind.OBJECT: {
      const obj = Object.create(null);
      valueNode.fields.forEach((field) => {
        obj[field.name.value] = valueFromASTUntyped(field.value);
      });
      return obj;
    }
    /* istanbul ignore next */
    default:
      throw new Error('Unexpected value kind: ' + valueNode.kind);
  }
}
