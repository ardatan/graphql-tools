import { inspect } from 'cross-inspect';
import {
  GraphQLInputType,
  isEnumType,
  isInputObjectType,
  isLeafType,
  isListType,
  isNonNullType,
  Kind,
  ObjectFieldNode,
  ValueNode,
} from 'graphql';
import { astFromValueUntyped } from './astFromValueUntyped.js';
import { isIterableObject, isObjectLike } from './jsutils.js';
import { Maybe } from './types.js';

/**
 * Produces a GraphQL Value AST given a JavaScript object.
 * Function will match JavaScript/JSON values to GraphQL AST schema format
 * by using suggested GraphQLInputType. For example:
 *
 *     astFromValue("value", GraphQLString)
 *
 * A GraphQL type must be provided, which will be used to interpret different
 * JavaScript values.
 *
 * | JSON Value    | GraphQL Value        |
 * | ------------- | -------------------- |
 * | Object        | Input Object         |
 * | Array         | List                 |
 * | Boolean       | Boolean              |
 * | String        | String / Enum Value  |
 * | Number        | Int / Float          |
 * | BigInt        | Int                  |
 * | Unknown       | Enum Value           |
 * | null          | NullValue            |
 *
 */
export function astFromValue(value: unknown, type: GraphQLInputType): Maybe<ValueNode> {
  if (isNonNullType(type)) {
    const astValue = astFromValue(value, type.ofType);
    if (astValue?.kind === Kind.NULL) {
      return null;
    }
    return astValue;
  }

  // only explicit null, not undefined, NaN
  if (value === null) {
    return { kind: Kind.NULL };
  }

  // undefined
  if (value === undefined) {
    return null;
  }

  // Convert JavaScript array to GraphQL list. If the GraphQLType is a list, but
  // the value is not an array, convert the value using the list's item type.
  if (isListType(type)) {
    const itemType = type.ofType;
    if (isIterableObject(value)) {
      const valuesNodes = [];
      for (const item of value) {
        const itemNode = astFromValue(item, itemType);
        if (itemNode != null) {
          valuesNodes.push(itemNode);
        }
      }
      return { kind: Kind.LIST, values: valuesNodes };
    }
    return astFromValue(value, itemType);
  }

  // Populate the fields of the input object by creating ASTs from each value
  // in the JavaScript object according to the fields in the input type.
  if (isInputObjectType(type)) {
    if (!isObjectLike(value)) {
      return null;
    }
    const fieldNodes: Array<ObjectFieldNode> = [];
    for (const field of Object.values(type.getFields())) {
      const fieldValue = astFromValue(value[field.name], field.type);
      if (fieldValue) {
        fieldNodes.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: field.name },
          value: fieldValue,
        });
      }
    }
    return { kind: Kind.OBJECT, fields: fieldNodes };
  }

  if (isLeafType(type)) {
    // Since value is an internally represented value, it must be serialized
    // to an externally represented value before converting into an AST.
    const serialized = type.serialize(value);
    if (serialized == null) {
      return null;
    }

    if (isEnumType(type)) {
      return { kind: Kind.ENUM, value: serialized as string };
    }

    // ID types can use Int literals.
    if (
      type.name === 'ID' &&
      typeof serialized === 'string' &&
      integerStringRegExp.test(serialized)
    ) {
      return { kind: Kind.INT, value: serialized };
    }

    return astFromValueUntyped(serialized);
  }
  /* c8 ignore next 3 */
  // Not reachable, all possible types have been considered.
  console.assert(false, 'Unexpected input type: ' + inspect(type));
}

/**
 * IntValue:
 *   - NegativeSign? 0
 *   - NegativeSign? NonZeroDigit ( Digit+ )?
 */
const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
