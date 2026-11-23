import {
  getVariableValues,
  GraphQLError,
  GraphQLLeafType,
  GraphQLSchema,
  isInputType,
  isLeafType,
  isListType,
  isNonNullType,
  Kind,
  typeFromAST,
  valueFromAST,
  type GraphQLInputType,
  type ValueNode,
  type VariableDefinitionNode,
} from 'graphql';
import { VariableValues } from '@graphql-tools/utils';
import { diagnoseLeafParseMiss, diagnoseVariableCoerceMiss } from './coerceDiagnose.js';
import {
  BUILTIN_LEAF_TYPES,
  EMPTY_RAW_VARIABLES,
  EMPTY_VARIABLE_VALUES,
  isGraphQL17,
} from './planShared.js';
import type { CoerceVariables, CoerceVariablesResult } from './planTypes.js';

/** Match graphql-js getVariableValues default (`maxErrors: 50`). */
const MAX_VARIABLE_COERCE_ERRORS = 50;

const TOO_MANY_VARIABLE_ERRORS = new GraphQLError(
  'Too many errors processing variables, error limit reached. Execution aborted.',
);

/** Nested property access threw; carry the error without re-reading the getter. */
const INPUT_COERCE_THROWN = Symbol.for('@graphql-tools/executor.inputCoerceThrown');

type ThrownCoerceResult = {
  readonly [INPUT_COERCE_THROWN]: true;
  readonly error: unknown;
};

function thrownCoerceResult(error: unknown): ThrownCoerceResult {
  return { [INPUT_COERCE_THROWN]: true, error };
}

function errorsFromThrownCoerce(value: ThrownCoerceResult): ReadonlyArray<GraphQLError> {
  const err = value.error;
  if (err instanceof GraphQLError) {
    return [err];
  }
  return [new GraphQLError(err instanceof Error ? err.message : String(err))];
}

/** GraphQL 16 uses plain objects; GraphQL 17 uses null-prototype maps. */
function newCoercedObject(): Record<string, unknown> {
  return (isGraphQL17 ? Object.create(null) : {}) as Record<string, unknown>;
}

/**
 * Compile a variableValues coercer for the operation.
 *
 * Fast path: **builtin primitive leaves only** (Int/Float/String/Boolean/ID and
 * NonNull wrappers). Lists, input objects, custom scalars, and custom iterables
 * use classic `getVariableValues` — no speculative coerce then fallback (R25).
 */
export function compileVariableCoercer(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
): CoerceVariables {
  if (variableDefinitions.length === 0) {
    return () => ({ variableValues: EMPTY_VARIABLE_VALUES });
  }

  const runFull: CoerceVariables = (rawVariableValues, options) =>
    runGetVariableValues(schema, variableDefinitions, rawVariableValues, options);

  const leafBindings = tryCompileBuiltinLeafVariableBindings(schema, variableDefinitions);
  if (leafBindings == null) {
    return runFull;
  }

  return (rawVariableValues, options) => {
    const fast = tryCoerceBuiltinLeafVariables(
      leafBindings,
      rawVariableValues,
      options?.hideSuggestions,
    );
    if (fast !== undefined) {
      return 'errors' in fast ? fast : { variableValues: fast };
    }
    return runFull(rawVariableValues, options);
  };
}

type VariableCoerceMissErrors = { errors: ReadonlyArray<GraphQLError> };

type VariableNonNullErrorParts = {
  missingMessage: string;
  nullMessage: string;
  nodes: VariableDefinitionNode;
};

function compileVariableNonNullErrorParts(
  def: VariableDefinitionNode,
  typeName: string,
): VariableNonNullErrorParts {
  const name = def.variable.name.value;
  if (isGraphQL17) {
    return {
      missingMessage: `Variable "$${name}" has invalid value: Expected a value of non-null type "${typeName}" to be provided.`,
      nullMessage: `Variable "$${name}" has invalid value: Expected value of non-null type "${typeName}" not to be null.`,
      nodes: def,
    };
  }
  return {
    missingMessage: `Variable "$${name}" of required type "${typeName}" was not provided.`,
    nullMessage: `Variable "$${name}" of non-null type "${typeName}" must not be null.`,
    nodes: def,
  };
}

function coerceDefaultLiteral(literal: ValueNode, type: GraphQLInputType): unknown {
  // Builtin leaves only reach this helper. Classic handles NullValue before hooks.
  let unwrapped: GraphQLInputType = type;
  let wasNonNull = false;
  while (isNonNullType(unwrapped)) {
    wasNonNull = true;
    unwrapped = unwrapped.ofType;
  }
  if (literal.kind === Kind.NULL) {
    return wasNonNull ? undefined : null;
  }
  return valueFromAST(literal, type);
}

/**
 * Apply a plan-held variable default for one execution. AST defaults are
 * re-coerced from the literal so mutable plan-held values are not shared.
 */
function materializePlanDefaultValue(
  defaultValue: unknown,
  defaultLiteral: ValueNode | undefined,
  variableType: GraphQLInputType,
): unknown | undefined {
  if (defaultLiteral != null) {
    const fresh = coerceDefaultLiteral(defaultLiteral, variableType);
    if (fresh === undefined) {
      return undefined;
    }
    return fresh;
  }
  return clonePlanDefaultValue(defaultValue);
}

/** Fresh copy of plan-held defaults so resolvers cannot mutate shared state. */
function clonePlanDefaultValue(value: unknown): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      out[i] = clonePlanDefaultValue(value[i]);
    }
    return out;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  const src = value as Record<string, unknown>;
  const out = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    out[key] = clonePlanDefaultValue(src[key]);
  }
  return out;
}

/**
 * Read one variable from the raw map. Getter throws become request errors
 * without retrying the accessor. GraphQL 17 treats own `undefined` as missing.
 */
function readRawVariable(
  raw: { readonly [key: string]: unknown },
  name: string,
): { kind: 'missing' } | { kind: 'value'; value: unknown } | { kind: 'thrown'; error: unknown } {
  let supplied: boolean;
  let value: unknown;
  try {
    supplied = Object.prototype.hasOwnProperty.call(raw, name);
    if (supplied) {
      value = raw[name];
    }
  } catch (error) {
    return { kind: 'thrown', error };
  }
  if (!supplied) {
    return { kind: 'missing' };
  }
  if (value === undefined && isGraphQL17) {
    return { kind: 'missing' };
  }
  return { kind: 'value', value };
}

type BuiltinLeafVariableBinding = {
  name: string;
  nonNull: boolean;
  leafType: GraphQLLeafType;
  /** Full variable input type (including NonNull) for GQL17 sources.signature. */
  variableType: GraphQLInputType;
  defaultValue: unknown;
  hasDefault: boolean;
  defaultLiteral: ValueNode | undefined;
  variableDef: VariableDefinitionNode;
  nonNullErrors: VariableNonNullErrorParts | undefined;
};

function tryCompileBuiltinLeafVariableBindings(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
): BuiltinLeafVariableBinding[] | undefined {
  const bindings: BuiltinLeafVariableBinding[] = [];
  for (const def of variableDefinitions) {
    const inputType = typeFromAST(schema, def.type);
    if (inputType == null || !isInputType(inputType)) {
      return undefined;
    }
    let type: GraphQLInputType = inputType;
    let nonNull = false;
    if (isNonNullType(type)) {
      nonNull = true;
      type = type.ofType;
    }
    if (isListType(type) || !isLeafType(type) || !BUILTIN_LEAF_TYPES.has(type)) {
      return undefined;
    }
    let hasDefault = false;
    let defaultValue: unknown;
    const defaultLiteral = def.defaultValue ?? undefined;
    if (def.defaultValue != null) {
      // Builtin AST defaults only — never custom parseLiteral at compile (R25).
      const compiledDefault = valueFromAST(def.defaultValue, inputType);
      if (compiledDefault === undefined) {
        return undefined;
      }
      hasDefault = true;
      defaultValue = compiledDefault;
    }
    bindings.push({
      name: def.variable.name.value,
      nonNull,
      leafType: type,
      variableType: inputType,
      defaultValue,
      hasDefault,
      defaultLiteral,
      variableDef: def,
      nonNullErrors: nonNull ? compileVariableNonNullErrorParts(def, String(inputType)) : undefined,
    });
  }
  return bindings;
}

/**
 * Push a variable error; returns true when the classic maxErrors limit is hit
 * (caller should stop and return `aggregated`, which includes the abort message).
 */
function pushVariableError(aggregated: GraphQLError[], error: GraphQLError): boolean {
  aggregated.push(error);
  if (aggregated.length >= MAX_VARIABLE_COERCE_ERRORS) {
    aggregated.push(TOO_MANY_VARIABLE_ERRORS);
    return true;
  }
  return false;
}

function tryCoerceBuiltinLeafVariables(
  bindings: ReadonlyArray<BuiltinLeafVariableBinding>,
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
  hideSuggestions?: boolean | null,
): VariableValues | VariableCoerceMissErrors | undefined {
  const raw = rawVariableValues ?? EMPTY_RAW_VARIABLES;
  const coerced = newCoercedObject();
  const sources = Object.create(null) as VariableValues['sources'];
  // Full classic-style aggregation: keep diagnosing later bindings after the
  // first NonNull miss / invalid scalar (null+invalid and invalid+null).
  const aggregated: GraphQLError[] = [];
  for (const binding of bindings) {
    const signature = {
      name: binding.name,
      type: binding.variableType,
      default: binding.hasDefault ? { literal: binding.defaultLiteral } : undefined,
    };
    const read = readRawVariable(raw, binding.name);
    if (read.kind === 'thrown') {
      for (const err of errorsFromThrownCoerce(thrownCoerceResult(read.error))) {
        if (pushVariableError(aggregated, err)) {
          return { errors: aggregated };
        }
      }
      continue;
    }
    if (read.kind === 'missing') {
      sources[binding.name] = { signature };
      if (binding.hasDefault) {
        const materialized = materializePlanDefaultValue(
          binding.defaultValue,
          binding.defaultLiteral,
          binding.variableType,
        );
        if (materialized === undefined) {
          // Fresh AST default coercion failed; classic getVariableValues.
          return aggregated.length > 0 ? { errors: aggregated } : undefined;
        }
        if (aggregated.length === 0) {
          coerced[binding.name] = materialized;
        }
        continue;
      }
      if (binding.nonNull) {
        const parts = binding.nonNullErrors!;
        if (
          pushVariableError(
            aggregated,
            new GraphQLError(parts.missingMessage, { nodes: parts.nodes }),
          )
        ) {
          return { errors: aggregated };
        }
        continue;
      }
      continue;
    }
    const value = read.value;
    sources[binding.name] = { signature, value };
    if (value == null) {
      if (binding.nonNull) {
        const parts = binding.nonNullErrors!;
        if (
          pushVariableError(aggregated, new GraphQLError(parts.nullMessage, { nodes: parts.nodes }))
        ) {
          return { errors: aggregated };
        }
        continue;
      }
      if (aggregated.length === 0) {
        coerced[binding.name] = null;
      }
      continue;
    }

    let parsed: unknown;
    try {
      const leaf = binding.leafType as GraphQLLeafType & {
        coerceInputValue?: (v: unknown, hide?: boolean | null) => unknown;
      };
      if (typeof leaf.coerceInputValue === 'function') {
        parsed = leaf.coerceInputValue(value, hideSuggestions);
        if (parsed === undefined) {
          if (
            pushVariableError(
              aggregated,
              diagnoseLeafParseMiss(
                binding.name,
                leaf,
                value,
                binding.variableDef,
                hideSuggestions,
              ),
            )
          ) {
            return { errors: aggregated };
          }
          continue;
        }
      } else {
        parsed = binding.leafType.parseValue(value);
      }
    } catch {
      if (
        pushVariableError(
          aggregated,
          diagnoseLeafParseMiss(
            binding.name,
            binding.leafType,
            value,
            binding.variableDef,
            hideSuggestions,
          ),
        )
      ) {
        return { errors: aggregated };
      }
      continue;
    }
    if (parsed == null && binding.nonNull) {
      const diagnosed = diagnoseVariableCoerceMiss(
        binding.name,
        binding.variableType,
        value,
        binding.variableDef,
        hideSuggestions,
      );
      if (diagnosed != null) {
        for (const err of diagnosed) {
          if (pushVariableError(aggregated, err)) {
            return { errors: aggregated };
          }
        }
        continue;
      }
      return aggregated.length > 0 ? { errors: aggregated } : undefined;
    }
    if (aggregated.length === 0) {
      coerced[binding.name] = parsed;
    }
  }
  if (aggregated.length > 0) {
    return { errors: aggregated };
  }
  return { coerced, sources };
}

function runGetVariableValues(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
  options?: { hideSuggestions?: boolean | null },
): CoerceVariablesResult {
  const result = getVariableValues(schema, variableDefinitions, rawVariableValues ?? {}, {
    maxErrors: MAX_VARIABLE_COERCE_ERRORS,
    hideSuggestions: options?.hideSuggestions ?? undefined,
  } as { maxErrors?: number });

  if (result.errors) {
    return { errors: result.errors };
  }

  if (isGraphQL17) {
    return {
      variableValues: (result as unknown as { variableValues: VariableValues }).variableValues,
    };
  }
  return {
    variableValues: {
      coerced: (result as unknown as { coerced: Record<string, unknown> }).coerced,
      sources: Object.create(null),
    },
  };
}
