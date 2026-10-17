import {
  coerceInputValue,
  GraphQLError,
  GraphQLInputType,
  GraphQLSchema,
  isInputObjectType,
  isInputType,
  isListType,
  isNonNullType,
  NamedTypeNode,
  print,
  typeFromAST,
  valueFromAST,
  VariableDefinitionNode,
} from 'graphql';
import {
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
  options?: { maxErrors?: number; hideSuggestions?: boolean },
): VariableValuesOrErrors {
  const errors: any[] = [];
  const maxErrors = options?.maxErrors;
  const hideSuggestions = options?.hideSuggestions;
  try {
    const variableValues = coerceVariableValues(
      schema,
      varDefNodes,
      inputs,
      error => {
        if (maxErrors != null && errors.length >= maxErrors) {
          throw new GraphQLError(
            'Too many errors processing variables, error limit reached. Execution aborted.',
          );
        }
        errors.push(error);
      },
      hideSuggestions,
    );

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
  hideSuggestions?: boolean,
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
        new GraphQLError(
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
          new GraphQLError(
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
    const sourceValue = snapshotInputValue(value, varType);
    sources[varName] = { signature, value: sourceValue };
    if (value === null && isNonNullType(varType)) {
      const varTypeStr = inspect(varType);
      onError(
        new GraphQLError(
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
        new GraphQLError(prefix + '; ' + error.message, {
          nodes: varDefNode,
          originalError: error,
        }),
      );
    };

    coercedValues[varName] = (coerceInputValue as any)(sourceValue, varType, callback);

    if (coercedValues[varName] === undefined && !errored) {
      validateInputValue(sourceValue, varType, callback, hideSuggestions);
    }
  }

  return {
    coerced: coercedValues,
    sources,
  };
}

function snapshotInputValue(value: unknown, type: GraphQLInputType): unknown {
  if (isNonNullType(type)) {
    return snapshotInputValue(value, type.ofType);
  }
  if (value == null) {
    return value;
  }
  if (isListType(type)) {
    if (!isIterableInput(value)) {
      return snapshotInputValue(value, type.ofType);
    }
    return Array.from(value, item => snapshotInputValue(item, type.ofType));
  }
  // Arrays are objects in JS; do not spread them into `{}` or invalid list
  // inputs (e.g. `[]` for an input object) would be accepted after defaults.
  // Snapshot into a null-prototype object so Object.prototype keys (e.g.
  // `toString`) are not treated as own fields, while still reading declared
  // fields with normal property access (prototype getters stay visible).
  if (isInputObjectType(type) && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      snapshot[key] = obj[key];
    }
    for (const field of Object.values(type.getFields())) {
      const fieldValue = obj[field.name];
      if (fieldValue !== undefined) {
        snapshot[field.name] = snapshotInputValue(fieldValue, field.type);
      }
    }
    return snapshot;
  }
  return value;
}

function isIterableInput(value: unknown): value is Iterable<unknown> {
  // Match graphql-js: only call Array.from when the iterator is callable.
  // `Symbol.iterator in value` is true for `{ [Symbol.iterator]: null }`, which
  // would otherwise snapshot to `[]` instead of a singleton list item.
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
  );
}
