import { Kind, type GraphQLArgument, type GraphQLInputField } from 'graphql';
import { astFromValue } from './astFromValue.js';

/**
 * `defaultValueFromType` extracts default value from `GraphQLArgument` or `GraphQLInputField`, if available
 * This is compatible with all `graphql` versions
 *
 * When runtime default value is available (in graphql@17), it'd return the object without Kind
 * Otherwise, it'd return a `ValueNode`.
 */
export const defaultValueFromType = (arg: GraphQLArgument | GraphQLInputField) => {
  // graphql >= v17 has `default` instead of `defaultValue`
  // So for backward compatibility with v16, we are using `arg.default as any`, otherwise, TypeScript report type error
  if ('default' in arg && (arg.default as any)?.value) {
    return arg.default;
  }

  if ('default' in arg && (arg.default as any)?.literal) {
    const value = convertConstValueNode((arg.default as any).literal);
    return astFromValue(value, arg.type);
  }

  // graphql < v17 has `defaultValue` instead of `default`
  return arg.defaultValue !== undefined
    ? (astFromValue(arg.defaultValue, arg.type) ?? undefined)
    : (undefined as any);
};

/**
 * `convertConstValueNode` exhaustively traverses an literal node (a node with constant value)
 * and constructs a JavaScript representation of the node values
 *
 * Note: `node` is supposed to be `ConstValueNode` for graphql@17 but
 * it is not available in graphql@15 so we cannot import it from `graphql`
 */
const convertConstValueNode = (node: any) => {
  if (node.kind === Kind.NULL) {
    return null;
  } else if (node.kind === Kind.LIST) {
    return node.values.map(convertConstValueNode);
  } else if (node.kind === Kind.OBJECT) {
    const result = {};
    for (const field of node.fields) {
      result[field.name.value] = convertConstValueNode(field.value);
    }
    return result;
  }

  return node.value;
};
