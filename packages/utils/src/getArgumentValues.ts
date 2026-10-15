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
  versionInfo,
} from 'graphql';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- namespace import only used to optionally call `getArgumentValues` when present (graphql-js@16+), not the restricted names
import * as GraphQLJS from 'graphql';
import { createGraphQLError } from './errors.js';
import { toGraphQLJSVariableValues } from './graphqlJSCompat.js';
import { hasOwnProperty } from './jsutils.js';

type GraphqlGetArgumentValues = (
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues?: any,
) => Record<string, any>;

// Dynamic key so bundlers (webpack on graphql@15) do not require a static
// `getArgumentValues` export that only exists on newer graphql-js releases.
const graphqlGetArgumentValuesExport = ['get', 'Argument', 'Values'].join('');
const graphqlGetArgumentValuesCandidate = (GraphQLJS as Record<string, unknown>)[
  graphqlGetArgumentValuesExport
];
const graphqlGetArgumentValues =
  typeof graphqlGetArgumentValuesCandidate === 'function'
    ? (graphqlGetArgumentValuesCandidate as GraphqlGetArgumentValues)
    : undefined;

/**
 * Prepares an object map of argument values given a list of argument
 * definitions and list of argument AST nodes.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 *
 * On graphql-js@17+, when the package exports `getArgumentValues`, delegates to
 * it (with `{ coerced, sources }` variable values) so GraphQL 17 `default`
 * coercion stays in sync with upstream. On older peers, uses the legacy
 * `defaultValue` + `valueFromAST` path below.
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
  if (versionInfo.major >= 17 && graphqlGetArgumentValues) {
    // graphql-js returns a null-prototype object; copy into a plain object so
    // the documented "object with a prototype" contract is preserved.
    return {
      ...graphqlGetArgumentValues(
        def,
        node,
        toGraphQLJSVariableValues(variableValues, variableSources),
      ),
    };
  }

  return getArgumentValuesLegacy(def, node, variableValues);
}

/**
 * Pre-graphql-js@17 argument coercion: `defaultValue` + `valueFromAST`.
 */
function getArgumentValuesLegacy(
  def: GraphQLField<any, any> | GraphQLDirective,
  node: FieldNode | DirectiveNode,
  variableValues: Record<string, any>,
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
