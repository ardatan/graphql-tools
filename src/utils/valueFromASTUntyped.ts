import { ValueNode, Kind } from 'graphql';

import keyValMap from '../esUtils/keyValMap';

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
      return keyValMap(
        valueNode.fields,
        (field) => field.name.value,
        (field) => valueFromASTUntyped(field.value),
      );
    }
    /* istanbul ignore next */
    default:
      throw new Error('Unexpected value kind: ' + valueNode.kind);
  }
}
