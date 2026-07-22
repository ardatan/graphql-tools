import {
  coerceInputValue,
  GraphQLError,
  GraphQLSchema,
  isInputType,
  isNonNullType,
  NamedTypeNode,
  print,
  typeFromAST,
  valueFromAST,
  VariableDefinitionNode,
} from 'graphql';
import {
  createGraphQLError,
  getOptionalGraphQLJSExport,
  hasOwnProperty,
  inspect,
  printPathArray,
} from '@graphql-tools/utils';

// `validateInputValue` was introduced in graphql-js@17, replacing the `onError`
// callback that `coerceInputValue` used to accept.
const validateInputValue = getOptionalGraphQLJSExport('validateInputValue');

// `coerceInputLiteral` was introduced in graphql-js@17. Unlike `valueFromAST`, it
// correctly rejects AST literals whose kind doesn't match the target type (e.g. an
// enum literal provided for a String variable default), which `valueFromAST`
// stopped doing in graphql-js@17. See the same pattern in getArgumentValues.ts.
const coerceInputLiteral = getOptionalGraphQLJSExport('coerceInputLiteral');

function getAtPath(value: unknown, path: ReadonlyArray<string | number>): unknown {
  let current = value;
  for (const key of path) {
    if (current == null || typeof current !== 'object' || !hasOwnProperty(current, String(key))) {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

type CoercedVariableValues =
  | { errors: ReadonlyArray<GraphQLError>; coerced?: never }
  | { coerced: { [variable: string]: unknown }; errors?: never };

/**
 * Prepares an object map of variableValues of the correct type based on the
 * provided variable definitions and arbitrary input. If the input cannot be
 * parsed to match the variable definitions, a GraphQLError will be thrown.
 *
 * Note: The returned value is a plain Object with a prototype, since it is
 * exposed to user code. Care should be taken to not pull values from the
 * Object prototype.
 */
export function getVariableValues(
  schema: GraphQLSchema,
  varDefNodes: ReadonlyArray<VariableDefinitionNode>,
  inputs: { readonly [variable: string]: unknown },
  options?: { maxErrors?: number },
): CoercedVariableValues {
  const errors: any[] = [];
  const maxErrors = options?.maxErrors;
  try {
    const coerced = coerceVariableValues(schema, varDefNodes, inputs, error => {
      if (maxErrors != null && errors.length >= maxErrors) {
        throw createGraphQLError(
          'Too many errors processing variables, error limit reached. Execution aborted.',
        );
      }
      errors.push(error);
    });

    if (errors.length === 0) {
      return { coerced };
    }
  } catch (error) {
    errors.push(error);
  }

  return { errors };
}

function coerceVariableValues(
  schema: GraphQLSchema,
  varDefNodes: ReadonlyArray<VariableDefinitionNode>,
  inputs: { readonly [variable: string]: unknown },
  onError: (error: GraphQLError) => void,
): { [variable: string]: unknown } {
  const coercedValues: { [variable: string]: unknown } = {};
  for (const varDefNode of varDefNodes) {
    const varName = varDefNode.variable.name.value;
    const varType = typeFromAST(schema, varDefNode.type as NamedTypeNode);
    if (!isInputType(varType)) {
      // Must use input types for variables. This should be caught during
      // validation, however is checked again here for safety.
      const varTypeStr = print(varDefNode.type);
      onError(
        createGraphQLError(
          `Variable "$${varName}" expected value of type "${varTypeStr}" which cannot be used as an input type.`,
          { nodes: varDefNode.type },
        ),
      );
      continue;
    }

    if (!hasOwnProperty(inputs, varName)) {
      if (varDefNode.defaultValue) {
        const coercedDefaultValue = coerceInputLiteral
          ? coerceInputLiteral(varDefNode.defaultValue, varType)
          : valueFromAST(varDefNode.defaultValue, varType);
        if (coercedDefaultValue === undefined) {
          // Schema/document validation should catch an invalid default value
          // before execution; this mirrors graphql-js's own
          // `coerceDefaultValue`/`maybeUseDefaultValue`, which report this
          // case as an error rather than silently producing `undefined`.
          onError(
            createGraphQLError(`Variable "$${varName}" has invalid default value.`, {
              nodes: varDefNode.defaultValue,
            }),
          );
        } else {
          coercedValues[varName] = coercedDefaultValue;
        }
      } else if (isNonNullType(varType)) {
        const varTypeStr = inspect(varType);
        onError(
          createGraphQLError(
            `Variable "$${varName}" of required type "${varTypeStr}" was not provided.`,
            {
              nodes: varDefNode,
            },
          ),
        );
      }
      continue;
    }

    const value = inputs[varName];
    if (value === null && isNonNullType(varType)) {
      const varTypeStr = inspect(varType);
      onError(
        createGraphQLError(
          `Variable "$${varName}" of non-null type "${varTypeStr}" must not be null.`,
          {
            nodes: varDefNode,
          },
        ),
      );
      continue;
    }

    const reportInvalidValue = (path: ReadonlyArray<string | number>, error: GraphQLError) => {
      let prefix = `Variable "$${varName}" got invalid value ` + inspect(getAtPath(value, path));
      if (path.length > 0) {
        prefix += ` at "${varName}${printPathArray(path)}"`;
      }
      onError(
        createGraphQLError(prefix + '; ' + error.message, {
          nodes: varDefNode,
          originalError: error,
        }),
      );
    };

    if (validateInputValue) {
      // graphql-js >= 17: `coerceInputValue` no longer reports diagnostics via a
      // callback, so fall back to `validateInputValue` when coercion fails.
      const coercedValue = coerceInputValue(value, varType);
      if (coercedValue !== undefined) {
        coercedValues[varName] = coercedValue;
      } else {
        validateInputValue(value, varType, (error, path) => reportInvalidValue(path, error));
      }
    } else {
      coercedValues[varName] = (coerceInputValue as any)(
        value,
        varType,
        (path: ReadonlyArray<string | number>, _invalidValue: unknown, error: GraphQLError) =>
          reportInvalidValue(path, error),
      );
    }
  }

  return coercedValues;
}
