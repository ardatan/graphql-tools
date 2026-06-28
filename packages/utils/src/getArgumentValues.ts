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
} from 'graphql';
import { defaultValueAstFromType } from './defaultValueAstFromType.js';
import { createGraphQLError } from './errors.js';
import { hasOwnProperty } from './jsutils.js';

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

  for (const arg of def.args) {
    const argumentNode = argNodeMap[arg.name];

    if (!argumentNode) {
      const defaultValue = defaultValueAstFromType(arg) as any;
      if (defaultValue) {
        coercedValues[arg.name] = defaultValue.value;
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

    const coercedValue = valueFromAST(valueNode, arg.type, variableValues);
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
