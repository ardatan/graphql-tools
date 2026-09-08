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
  hasOwnProperty,
  inspect,
  printPathArray,
  VariableValues,
  VariableValueSource,
} from '@graphql-tools/utils';
import { validateInputValue } from './validateInputValue.js';

export type VariableValuesOrErrors =
  | { errors: ReadonlyArray<GraphQLError>; variableValues?: never }
  | { variableValues: VariableValues; errors?: never };

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
): VariableValuesOrErrors {
  const errors: any[] = [];
  const maxErrors = options?.maxErrors;
  try {
    const variableValues = coerceVariableValues(schema, varDefNodes, inputs, error => {
      if (maxErrors != null && errors.length >= maxErrors) {
        throw createGraphQLError(
          'Too many errors processing variables, error limit reached. Execution aborted.',
        );
      }
      errors.push(error);
    });

    if (errors.length === 0) {
      return { variableValues };
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
): VariableValues {
  const coercedValues: { [variable: string]: unknown } = {};
  const sources: Record<string, VariableValueSource> = {};
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

    const signature = {
      name: varName,
      type: varType,
      default: varDefNode.defaultValue == null ? undefined : { literal: varDefNode.defaultValue },
    };

    if (!hasOwnProperty(inputs, varName)) {
      sources[varName] = { signature };
      if (varDefNode.defaultValue) {
        coercedValues[varName] = valueFromAST(varDefNode.defaultValue, varType);
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
    sources[varName] = { signature, value };
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

    let errored = false;
    const callback = (
      path: ReadonlyArray<string | number>,
      invalidValue: unknown,
      error: GraphQLError,
    ) => {
      errored = true;
      let prefix = `Variable "$${varName}" got invalid value ` + inspect(invalidValue);
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

    coercedValues[varName] = (coerceInputValue as any)(value, varType, callback);

    if (coercedValues[varName] === undefined && !errored) {
      validateInputValue(value, varType, callback);
    }
  }

  return {
    coerced: coercedValues,
    sources,
  };
}
