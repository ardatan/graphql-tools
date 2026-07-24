import { inspect } from 'cross-inspect';
import {
  ArgumentNode,
  DirectiveNode,
  FieldNode,
  GraphQLDirective,
  GraphQLField,
  isNonNullType,
  Kind,
  print,
  valueFromAST,
  valueFromASTUntyped,
} from 'graphql';
import { createGraphQLError } from './errors.js';
import { getOptionalGraphQLJSExport, toGraphQLJSVariableValues } from './graphqlJSCompat.js';
import { hasOwnProperty } from './jsutils.js';

const coerceInputLiteral = getOptionalGraphQLJSExport('coerceInputLiteral');

/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
export function getArgumentValues(
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues: Record<string, any> = {},
): Record<string, any> {
  const coercedValues = {};

  const argumentNodes = node.arguments ?? [];
  const argNodeMap: Record<string, ArgumentNode> = argumentNodes.reduce(
    (prev, arg) => ({
      ...prev,
      [arg.name.value]: arg,
    }),
    {},
  );

  // `variableValues` is loop-invariant; wrap (and memoize) it once instead of
  // once per argument, reusing the same graphql-js@17 `{ coerced, sources }`
  // shape used for directive-argument coercion elsewhere in this package.
  const wrappedVariableValues = toGraphQLJSVariableValues(variableValues);

  for (const arg of def.args) {
    const argumentNode = argNodeMap[arg.name];

    if (!argumentNode) {
      if ('default' in (arg as any) && (arg as any).default) {
        // graphql v17
        const defaultInput = (arg as any).default;
        if ('value' in defaultInput) {
          coercedValues[arg.name] = defaultInput.value;
        } else {
          const coercedDefaultValue = coerceInputLiteral
            ? coerceInputLiteral(defaultInput.literal, arg.type)
            : valueFromASTUntyped(defaultInput.literal);
          if (coercedDefaultValue === undefined) {
            // Schema validation should catch an invalid default value before
            // execution; this mirrors graphql-js's own `coerceDefaultValue`,
            // which treats this case as an invariant failure rather than
            // silently producing `undefined`.
            throw createGraphQLError(
              `Argument "${arg.name}" has invalid default value ${print(defaultInput.literal)}.`,
              { nodes: [defaultInput.literal] },
            );
          }
          coercedValues[arg.name] = coercedDefaultValue;
        }
      } else if (arg.defaultValue !== undefined) {
        // graphql < v17
        coercedValues[arg.name] = arg.defaultValue;
      } else if (isNonNullType(arg.type)) {
        throw createGraphQLError(
          `Argument "${arg.name}" of required type "${inspect(arg.type)}" ` + 'was not provided.',
          {
            nodes: [node],
          },
        );
      }
      continue;
    }

    const valueNode = argumentNode.value;
    let isNull = valueNode.kind === Kind.NULL;

    if (valueNode.kind === Kind.VARIABLE) {
      const variableName = valueNode.name.value;
      if (variableValues == null || !hasOwnProperty(variableValues, variableName)) {
        if (arg.defaultValue !== undefined) {
          coercedValues[arg.name] = arg.defaultValue;
        } else if (isNonNullType(arg.type)) {
          throw createGraphQLError(
            `Argument "${arg.name}" of required type "${inspect(arg.type)}" ` +
              `was provided the variable "$${variableName}" which was not provided a runtime value.`,
            {
              nodes: [valueNode],
            },
          );
        }
        continue;
      }
      isNull = variableValues[variableName] == null;
    }

    if (isNull && isNonNullType(arg.type)) {
      throw createGraphQLError(
        `Argument "${arg.name}" of non-null type "${inspect(arg.type)}" ` + 'must not be null.',
        {
          nodes: [valueNode],
        },
      );
    }

    const coercedValue = coerceInputLiteral
      ? coerceInputLiteral(valueNode, arg.type, wrappedVariableValues)
      : valueFromAST(valueNode, arg.type, variableValues);
    if (coercedValue === undefined) {
      // Note: ValuesOfCorrectTypeRule validation should catch this before
      // execution. This is a runtime check to ensure execution does not
      // continue with an invalid argument value.
      throw createGraphQLError(`Argument "${arg.name}" has invalid value ${print(valueNode)}.`, {
        nodes: [valueNode],
      });
    }
    coercedValues[arg.name] = coercedValue;
  }
  return coercedValues;
}
