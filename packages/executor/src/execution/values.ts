import {
  GraphQLError,
  VariableDefinitionNode,
  print,
  isInputType,
  isNonNullType,
  GraphQLSchema,
  coerceInputValue,
  typeFromAST,
  valueFromAST,
  NamedTypeNode,
} from 'graphql';
import { createGraphQLError, hasOwnProperty, inspect, printPathArray } from '@graphql-tools/utils';

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
  options?: { maxErrors?: number }
): CoercedVariableValues {
  const errors = [];
  const maxErrors = options?.maxErrors;
  try {
    const coerced = coerceVariableValues(schema, varDefNodes, inputs, error => {
      if (maxErrors != null && errors.length >= maxErrors) {
        throw createGraphQLError('Too many errors processing variables, error limit reached. Execution aborted.');
      }
      errors.push(error);
    });

    if (errors.length === 0) {
      return { coerced };
    }
  } catch (error) {
    errors.push(error);
  }

  // @ts-expect-error - We know that errors is an array of GraphQLError.
  return { errors };
}

function coerceVariableValues(
  schema: GraphQLSchema,
  varDefNodes: ReadonlyArray<VariableDefinitionNode>,
  inputs: { readonly [variable: string]: unknown },
  onError: (error: GraphQLError) => void
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
          { nodes: varDefNode.type }
        )
      );
      continue;
    }

    if (!hasOwnProperty(inputs, varName)) {
      if (varDefNode.defaultValue) {
        coercedValues[varName] = valueFromAST(varDefNode.defaultValue, varType);
      } else if (isNonNullType(varType)) {
        const varTypeStr = inspect(varType);
        onError(
          createGraphQLError(`Variable "$${varName}" of required type "${varTypeStr}" was not provided.`, {
            nodes: varDefNode,
          })
        );
      }
      continue;
    }

    const value = inputs[varName];
    if (value === null && isNonNullType(varType)) {
      const varTypeStr = inspect(varType);
      onError(
        createGraphQLError(`Variable "$${varName}" of non-null type "${varTypeStr}" must not be null.`, {
          nodes: varDefNode,
        })
      );
      continue;
    }

    coercedValues[varName] = coerceInputValue(value, varType, (path, invalidValue, error) => {
      let prefix = `Variable "$${varName}" got invalid value ` + inspect(invalidValue);
      if (path.length > 0) {
        prefix += ` at "${varName}${printPathArray(path)}"`;
      }
      onError(
        createGraphQLError(prefix + '; ' + error.message, {
          nodes: varDefNode,
          originalError: error.originalError,
        })
      );
    });
  }

  return coercedValues;
}
