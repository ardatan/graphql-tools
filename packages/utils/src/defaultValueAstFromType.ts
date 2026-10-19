import {
  valueFromASTUntyped,
  type GraphQLArgument,
  type GraphQLInputField,
  type ValueNode,
} from 'graphql';
import { astFromValue } from './astFromValue.js';
import { astFromValueUntyped } from './astFromValueUntyped.js';

/**
 * `defaultValueAstFromType` extracts default value from `GraphQLArgument` or `GraphQLInputField`, if available.
 *
 * Handles both graphql@16 (`defaultValue`) and graphql@17 (`default`) shapes.
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

    const value = valueFromASTUntyped((arg.default as any).literal);
    return (astFromValue(value, arg.type) as any) ?? undefined;
  }

  // graphql < v17 has `defaultValue` instead of `default`
  return (arg as any).defaultValue !== undefined
    ? ((astFromValue((arg as any).defaultValue, (arg as any).type) as any) ?? undefined)
    : undefined;
};
