import { Kind, type GraphQLArgument, type GraphQLInputField, type ValueNode } from 'graphql';
import { astFromValue } from './astFromValue.js';
import { astFromValueUntyped } from './astFromValueUntyped.js';

/**
 * `defaultValueAstFromType` extracts default value from `GraphQLArgument` or `GraphQLInputField`, if available
 * This is compatible with all `graphql` versions
 *
 * The return type is `ConstValueNode` in graphql@16+,
 * but it is not available in graphql@15 so `ValueNode` is used as return type here and `as any` is often required at callsites for backwards compatibility,
 */
export const defaultValueAstFromType = (
  arg: GraphQLArgument | GraphQLInputField,
): ValueNode | undefined => {
  // graphql >= v17 has `default` instead of `defaultValue`
  // So for backward compatibility with v16, we are using `arg.default as any`, otherwise, TypeScript report type error
  if ('default' in arg) {
    if (!arg.default) {
      return undefined;
    }

    if ('value' in (arg.default as any)) {
      return (astFromValueUntyped((arg.default as any).value) as any) ?? undefined;
    }

    const value = convertConstValueNode((arg.default as any).literal);
    return (astFromValue(value, arg.type) as any) ?? undefined;
  }

  // graphql < v17 has `defaultValue` instead of `default`
  return (arg as any).defaultValue !== undefined
    ? ((astFromValue((arg as any).defaultValue, (arg as any).type) as any) ?? undefined)
    : undefined;
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
