import { inspect } from 'cross-inspect';
import {
  DirectiveNode,
  FieldNode,
  GraphQLDirective,
  GraphQLField,
  isNonNullType,
  Kind,
  print,
  valueFromAST,
  versionInfo,
} from 'graphql';
import { coerceDefaultValue, coerceInputLiteral } from './coerceInputs.js';
import { createGraphQLError } from './errors.js';
import { toGraphQLJSVariableValues } from './graphqlJSCompat.js';
import { hasOwnProperty } from './jsutils.js';

/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 *
 * On graphql-js@17+, uses a local copy of graphql-js input coercion so
 * `default` / `coerceInputLiteral` work without importing those optional
 * exports. On older peers, uses the legacy `defaultValue` + `valueFromAST`
 * path.
 */
export function getArgumentValues(
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues: Record<string, any> = {},
  /**
   * Optional GraphQL 17 variable sources (declared type + original input) from
   * the executor. When omitted, synthetic sources are built from the flat
   * coerced map for callers that only have runtime values.
   */
  variableSources?: Record<string, unknown>,
): Record<string, any> {
  if (versionInfo.major >= 17) {
    return getArgumentValuesGraphQL17(def, node, variableValues, variableSources);
  }
  return getArgumentValuesLegacy(def, node, variableValues);
}

function getArgumentValuesGraphQL17(
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues: Record<string, any>,
  variableSources?: Record<string, unknown>,
): Record<string, any> {
  const coercedValues: Record<string, any> = {};
  const argumentNodes = node.arguments ?? [];
  const argNodeMap = new Map(argumentNodes.map(arg => [arg.name.value, arg]));
  const wrappedVariableValues = toGraphQLJSVariableValues(variableValues, variableSources);

  for (const arg of def.args) {
    const argumentNode = argNodeMap.get(arg.name);

    if (!argumentNode) {
      const defaultValue = coerceDefaultValue(arg as any);
      if (defaultValue !== undefined) {
        coercedValues[arg.name] = defaultValue;
      } else if (isNonNullType(arg.type)) {
        throw createGraphQLError(
          `Argument "${arg.name}" of required type "${inspect(arg.type)}" ` + 'was not provided.',
          { nodes: [node] },
        );
      }
      continue;
    }

    const valueNode = argumentNode.value;
    let isNull = valueNode.kind === Kind.NULL;

    if (valueNode.kind === Kind.VARIABLE) {
      const variableName = valueNode.name.value;
      if (variableValues == null || !hasOwnProperty(variableValues, variableName)) {
        const defaultValue = coerceDefaultValue(arg as any);
        if (defaultValue !== undefined) {
          coercedValues[arg.name] = defaultValue;
        } else if (isNonNullType(arg.type)) {
          throw createGraphQLError(
            `Argument "${arg.name}" of required type "${inspect(arg.type)}" ` +
              `was provided the variable "$${variableName}" which was not provided a runtime value.`,
            { nodes: [valueNode] },
          );
        }
        continue;
      }
      isNull = variableValues[variableName] == null;
    }

    if (isNull && isNonNullType(arg.type)) {
      throw createGraphQLError(
        `Argument "${arg.name}" of non-null type "${inspect(arg.type)}" ` + 'must not be null.',
        { nodes: [valueNode] },
      );
    }

    const coercedValue = coerceInputLiteral(valueNode, arg.type, wrappedVariableValues);
    if (coercedValue === undefined) {
      throw createGraphQLError(`Argument "${arg.name}" has invalid value ${print(valueNode)}.`, {
        nodes: [valueNode],
      });
    }
    coercedValues[arg.name] = coercedValue;
  }

  return coercedValues;
}

/**
 * Pre-graphql-js@17 argument coercion: `defaultValue` + `valueFromAST`.
 */
function getArgumentValuesLegacy(
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues: Record<string, any>,
): Record<string, any> {
  const coercedValues: Record<string, any> = {};
  const argumentNodes = node.arguments ?? [];
  const argNodeMap = new Map(argumentNodes.map(arg => [arg.name.value, arg]));

  for (const arg of def.args) {
    const argumentNode = argNodeMap.get(arg.name);

    if (!argumentNode) {
      if (arg.defaultValue !== undefined) {
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

    const coercedValue = valueFromAST(valueNode, arg.type, variableValues);
    if (coercedValue === undefined) {
      throw createGraphQLError(`Argument "${arg.name}" has invalid value ${print(valueNode)}.`, {
        nodes: [valueNode],
      });
    }
    coercedValues[arg.name] = coercedValue;
  }
  return coercedValues;
}
