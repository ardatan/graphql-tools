import {
  coerceInputValue,
  getVariableValues,
  GraphQLError,
  GraphQLLeafType,
  GraphQLSchema,
  isInputObjectType,
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
import { isIterableObject } from 'graphql/jsutils/isIterableObject.js';
import { VariableValues } from '@graphql-tools/utils';
import { diagnoseLeafParseMiss, diagnoseVariableCoerceMiss } from './coerceDiagnose.js';
import {
  BUILTIN_LEAF_TYPES,
  EMPTY_RAW_VARIABLES,
  EMPTY_VARIABLE_VALUES,
  isGraphQL17,
} from './planShared.js';
import type { CoerceVariables, CoerceVariablesResult } from './planTypes.js';

/**
 * Sentinel from hoisted input coercers: valid input that the fast path cannot
 * handle (e.g. Set / custom array iterator). Runtime skips diagnose and falls
 * back to getVariableValues.
 */
const INPUT_COERCE_DEFER = Symbol.for('@graphql-tools/executor.inputCoerceDefer');

/** Nested property access threw; carry the error without re-reading the getter. */
const INPUT_COERCE_THROWN = Symbol.for('@graphql-tools/executor.inputCoerceThrown');

type ThrownCoerceResult = {
  readonly [INPUT_COERCE_THROWN]: true;
  readonly error: unknown;
};

function thrownCoerceResult(error: unknown): ThrownCoerceResult {
  return { [INPUT_COERCE_THROWN]: true, error };
}

function isThrownCoerceResult(value: unknown): value is ThrownCoerceResult {
  return (
    typeof value === 'object' &&
    value != null &&
    (value as ThrownCoerceResult)[INPUT_COERCE_THROWN] === true
  );
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

/** True when any leaf under `type` defines GraphQL 17 `coerceInputLiteral`. */
function typeUsesCoerceInputLiteral(
  type: GraphQLInputType,
  visited: Set<GraphQLInputType> = new Set(),
): boolean {
  let t: GraphQLInputType = type;
  while (isNonNullType(t) || isListType(t)) {
    t = t.ofType;
  }
  if (isLeafType(t)) {
    return (
      typeof (t as GraphQLLeafType & { coerceInputLiteral?: unknown }).coerceInputLiteral ===
      'function'
    );
  }
  if (isInputObjectType(t)) {
    if (visited.has(t)) {
      return false;
    }
    visited.add(t);
    for (const field of Object.values(t.getFields())) {
      if (typeUsesCoerceInputLiteral(field.type, visited)) {
        return true;
      }
    }
  }
  return false;
}

function coerceDefaultLiteral(literal: ValueNode, type: GraphQLInputType): unknown {
  // valueFromAST shares this module's graphql instance (avoid require()-ing a
  // second copy under vitest). GraphQL 17 may normalize AST defaults via
  // coerceInputLiteral while valueFromAST still calls parseLiteral — prefer
  // the literal hook on leaves, and decline nested/list shapes that need it
  // so getVariableValues owns classic coercion.
  let unwrapped: GraphQLInputType = type;
  let wasNonNull = false;
  while (isNonNullType(unwrapped)) {
    wasNonNull = true;
    unwrapped = unwrapped.ofType;
  }
  // Classic handles NullValue before scalar hooks (nullable → null; NonNull → miss).
  if (literal.kind === Kind.NULL) {
    return wasNonNull ? undefined : null;
  }
  if (isLeafType(unwrapped)) {
    const leaf = unwrapped as GraphQLLeafType & {
      coerceInputLiteral?: (valueNode: ValueNode) => unknown;
    };
    if (typeof leaf.coerceInputLiteral === 'function') {
      try {
        return leaf.coerceInputLiteral(literal);
      } catch {
        return undefined;
      }
    }
  } else if (typeUsesCoerceInputLiteral(type)) {
    return undefined;
  }
  return valueFromAST(literal, type);
}

/**
 * Compile a variableValues coercer for the operation.
 * - No variables → empty map
 * - All builtin leaf (or NonNull leaf) vars → fast parseValue path with
 *   getVariableValues fallback for exact GraphQLError messaging (AST defaults
 *   compiled via valueFromAST when present)
 * - Else try hoisted per-input-type coercer closures (lists / input objects /
 *   @oneOf / custom leaves / AST defaults) with getVariableValues fallback
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
  if (leafBindings != null) {
    return (rawVariableValues, options) => {
      // P1-06: memoize raw reads so getVariableValues fallback cannot re-consume getters.
      const memoRaw = memoizeRawVariableValues(rawVariableValues);
      const fast = tryCoerceBuiltinLeafVariables(leafBindings, memoRaw, options?.hideSuggestions);
      if (fast !== undefined) {
        return 'errors' in fast ? fast : { variableValues: fast };
      }
      return runFull(memoRaw, options);
    };
  }

  const inputBindings = tryCompileHoistedVariableBindings(schema, variableDefinitions);
  if (inputBindings == null) {
    return runFull;
  }

  return (rawVariableValues, options) => {
    const memoRaw = memoizeRawVariableValues(rawVariableValues);
    const fast = tryCoerceHoistedVariables(inputBindings, memoRaw, options?.hideSuggestions);
    if (fast !== undefined) {
      return 'errors' in fast ? fast : { variableValues: fast };
    }
    return runFull(memoRaw, options);
  };
}

/**
 * Cache own-property reads (including getter throws) so a fast-path miss that
 * falls back to getVariableValues does not re-invoke one-shot accessors (P1-06).
 */
function memoizeRawVariableValues(
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
): { readonly [key: string]: unknown } {
  if (rawVariableValues == null) {
    return EMPTY_RAW_VARIABLES;
  }
  const raw = rawVariableValues;
  const cache = new Map<
    PropertyKey,
    { kind: 'value'; value: unknown } | { kind: 'throw'; error: unknown }
  >();
  return new Proxy(raw as object, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
      const hit = cache.get(prop);
      if (hit != null) {
        if (hit.kind === 'throw') {
          throw hit.error;
        }
        return hit.value;
      }
      try {
        const value = Reflect.get(target, prop, receiver);
        cache.set(prop, { kind: 'value', value });
        return value;
      } catch (error) {
        cache.set(prop, { kind: 'throw', error });
        throw error;
      }
    },
  }) as { readonly [key: string]: unknown };
}

/** Plan-bound input value coercer; returns `undefined` to signal fallback. */
type InputValueCoercer = (raw: unknown) => unknown | undefined;

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

type HoistedVariableBinding = {
  name: string;
  nonNull: boolean;
  variableType: GraphQLInputType;
  coerce: InputValueCoercer;
  hasDefault: boolean;
  /** Coerced JS default from AST (when `hasDefault`). */
  defaultValue: unknown;
  /** AST default node for GQL17 `sources.signature.default.literal`. */
  defaultLiteral: ValueNode | undefined;
  variableDef: VariableDefinitionNode;
  /** Plan-held missing/null messages when `nonNull` (#11). */
  nonNullErrors: VariableNonNullErrorParts | undefined;
};

/**
 * Compile hoisted per-type input coercers (lists / input objects / @oneOf /
 * custom leaves). Variable AST defaults are valueFromAST'd at compile time.
 * Cost is linear in input types (shared via cache), not in selection paths.
 */
function tryCompileHoistedVariableBindings(
  schema: GraphQLSchema,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
): HoistedVariableBinding[] | undefined {
  const typeCache = new Map<GraphQLInputType, InputValueCoercer>();
  const bindings: HoistedVariableBinding[] = [];
  for (const def of variableDefinitions) {
    const inputType = typeFromAST(schema, def.type);
    if (inputType == null || !isInputType(inputType)) {
      return undefined;
    }
    const coerce = compileInputValueCoercer(inputType, typeCache);
    if (coerce == null) {
      return undefined;
    }
    let hasDefault = false;
    let defaultValue: unknown;
    const defaultLiteral = def.defaultValue ?? undefined;
    if (def.defaultValue != null) {
      // GraphQL 17: prefer coerceInputLiteral so custom scalars match classic.
      const compiledDefault = coerceDefaultLiteral(def.defaultValue, inputType);
      if (compiledDefault === undefined) {
        // Invalid default , leave to getVariableValues for exact errors.
        return undefined;
      }
      hasDefault = true;
      defaultValue = compiledDefault;
    }
    const nonNull = isNonNullType(inputType);
    bindings.push({
      name: def.variable.name.value,
      nonNull,
      variableType: inputType,
      coerce,
      hasDefault,
      defaultValue,
      defaultLiteral,
      variableDef: def,
      nonNullErrors: nonNull ? compileVariableNonNullErrorParts(def, String(inputType)) : undefined,
    });
  }
  return bindings;
}

function tryCoerceHoistedVariables(
  bindings: ReadonlyArray<HoistedVariableBinding>,
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
  hideSuggestions?: boolean | null,
): VariableValues | VariableCoerceMissErrors | undefined {
  const raw = rawVariableValues ?? EMPTY_RAW_VARIABLES;
  const coerced = newCoercedObject();
  const sources = Object.create(null) as VariableValues['sources'];
  // P1-05: collect NonNull missing/null errors like classic maxErrors aggregation.
  const aggregated: GraphQLError[] = [];
  for (const binding of bindings) {
    const signature = {
      name: binding.name,
      type: binding.variableType,
      default: binding.hasDefault ? { literal: binding.defaultLiteral } : undefined,
    };
    const read = readRawVariable(raw, binding.name);
    if (read.kind === 'thrown') {
      return {
        errors: [...aggregated, ...errorsFromThrownCoerce(thrownCoerceResult(read.error))],
      };
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
        coerced[binding.name] = materialized;
        continue;
      }
      if (binding.nonNull) {
        const parts = binding.nonNullErrors!;
        aggregated.push(new GraphQLError(parts.missingMessage, { nodes: parts.nodes }));
        continue;
      }
      continue;
    }
    const value = read.value;
    sources[binding.name] = { signature, value };
    if (value == null && binding.nonNull) {
      const parts = binding.nonNullErrors!;
      aggregated.push(new GraphQLError(parts.nullMessage, { nodes: parts.nodes }));
      continue;
    }
    if (aggregated.length > 0) {
      // Already failing NonNull vars — still walk remaining bindings for more
      // NonNull misses, but skip value coerce (classic aggregates without
      // needing successful coerced maps).
      continue;
    }
    const coercedValue = binding.coerce(value);
    if (coercedValue === INPUT_COERCE_DEFER) {
      // Valid iterable / custom-iterator input: classic getVariableValues.
      return undefined;
    }
    if (isThrownCoerceResult(coercedValue)) {
      return { errors: errorsFromThrownCoerce(coercedValue) };
    }
    if (coercedValue === undefined) {
      const diagnosed = diagnoseVariableCoerceMiss(
        binding.name,
        binding.variableType,
        value,
        binding.variableDef,
        hideSuggestions,
      );
      if (diagnosed != null) {
        return { errors: diagnosed };
      }
      return undefined;
    }
    coerced[binding.name] = coercedValue;
  }
  if (aggregated.length > 0) {
    return { errors: aggregated };
  }
  return { coerced, sources };
}
/**
 * Build a plan-bound coercer for one input type (shared across variables).
 * `@oneOf` is handled on the happy path; failures return `undefined` so
 * runtime can fall back to getVariableValues for GraphQLError parity.
 */
function compileInputValueCoercer(
  type: GraphQLInputType,
  cache: Map<GraphQLInputType, InputValueCoercer>,
): InputValueCoercer | null {
  const cached = cache.get(type);
  if (cached != null) {
    return cached;
  }

  if (isNonNullType(type)) {
    const inner = compileInputValueCoercer(type.ofType, cache);
    if (inner == null) {
      return null;
    }
    const coercer: InputValueCoercer = raw => {
      if (raw == null) {
        return undefined;
      }
      return inner(raw);
    };
    cache.set(type, coercer);
    return coercer;
  }

  if (isListType(type)) {
    const itemCoercer = compileInputValueCoercer(type.ofType, cache);
    if (itemCoercer == null) {
      return null;
    }
    const coercer: InputValueCoercer = raw => {
      if (raw == null) {
        return null;
      }
      // Non-array iterables (Set, generators) and arrays with a custom iterator
      // must use classic getVariableValues (indexed path would miss yielded
      // values; Array.from on generators cannot be rewound after a miss).
      if (!Array.isArray(raw)) {
        if (isIterableObject(raw)) {
          return INPUT_COERCE_DEFER;
        }
        // graphql-js: non-iterable non-null → singleton wrap.
        const item = itemCoercer(raw);
        if (item === INPUT_COERCE_DEFER) {
          return INPUT_COERCE_DEFER;
        }
        if (isThrownCoerceResult(item)) {
          return item;
        }
        return item === undefined ? undefined : [item];
      }
      if (raw[Symbol.iterator] !== Array.prototype[Symbol.iterator]) {
        return INPUT_COERCE_DEFER;
      }
      const list = raw;
      const out: unknown[] = [];
      for (let i = 0; i < list.length; i++) {
        const item = itemCoercer(list[i]);
        if (item === INPUT_COERCE_DEFER) {
          return INPUT_COERCE_DEFER;
        }
        if (isThrownCoerceResult(item)) {
          return item;
        }
        if (item === undefined) {
          return undefined;
        }
        out.push(item);
      }
      return out;
    };
    cache.set(type, coercer);
    return coercer;
  }

  if (isLeafType(type)) {
    const leafType = type as GraphQLLeafType & {
      coerceInputValue?: (v: unknown, hide?: boolean | null) => unknown;
    };
    const coercer: InputValueCoercer = raw => {
      if (raw == null) {
        return null;
      }
      try {
        // GraphQL 17 prefers coerceInputValue when present (builtin path parity).
        const parsed =
          typeof leafType.coerceInputValue === 'function'
            ? leafType.coerceInputValue(raw)
            : leafType.parseValue(raw);
        // parseValue / coerceInputValue returning undefined → fallback.
        return parsed === undefined ? undefined : parsed;
      } catch {
        return undefined;
      }
    };
    cache.set(type, coercer);
    return coercer;
  }

  if (isInputObjectType(type)) {
    // Forwarding stub so recursive fields call the completed coercer (not a
    // stale `() => undefined` placeholder captured during field compile).
    let completed: InputValueCoercer | undefined;
    const forwarder: InputValueCoercer = raw => (completed == null ? undefined : completed(raw));
    cache.set(type, forwarder);

    const fields = type.getFields();
    const fieldEntries: Array<{
      name: string;
      nonNull: boolean;
      coerce: InputValueCoercer;
      hasDefault: boolean;
      defaultValue: unknown;
    }> = [];

    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName]!;
      const fieldCoercer = compileInputValueCoercer(field.type, cache);
      if (fieldCoercer == null) {
        cache.delete(type);
        return null;
      }
      const defaultValue = getInputFieldDefaultValue(field);
      // Value-form or literal defaults that fail coercion must not silently omit
      // the field (would drop `= [1]` when coerceInputLiteral declines lists).
      // GraphQL 16 typings have only `defaultValue`; GQL17 `default` is optional.
      const gql17Default = (field as { default?: { literal?: ValueNode; value?: unknown } })
        .default;
      if (
        defaultValue === undefined &&
        gql17Default != null &&
        (Object.prototype.hasOwnProperty.call(gql17Default, 'value') ||
          gql17Default.literal != null)
      ) {
        cache.delete(type);
        return null;
      }
      fieldEntries.push({
        name: fieldName,
        nonNull: isNonNullType(field.type),
        coerce: fieldCoercer,
        hasDefault: defaultValue !== undefined,
        defaultValue,
      });
    }

    const expectedKeys = new Set(fieldEntries.map(f => f.name));

    // Keep the non-@oneOf hot path byte-stable with the prior hoisted coercer
    // (dense nested coerce benches). @oneOf gets a dedicated closure.
    if (type.isOneOf === true) {
      const coercer: InputValueCoercer = raw => {
        if (raw == null) {
          return null;
        }
        if (typeof raw !== 'object' || Array.isArray(raw)) {
          return undefined;
        }
        const obj = raw as Record<string, unknown>;
        let definedFieldCount = 0;
        let onlyKey: string | undefined;
        let onlyValue: unknown;
        for (const key of Object.keys(obj)) {
          let keyValue: unknown;
          try {
            keyValue = obj[key];
          } catch (error) {
            return thrownCoerceResult(error);
          }
          if (keyValue === undefined) {
            // GraphQL 17 treats own undefined as missing; GraphQL 16 still
            // sees the key and must reject unknowns.
            if (!isGraphQL17 && !expectedKeys.has(key)) {
              return undefined;
            }
            continue;
          }
          definedFieldCount++;
          onlyKey = key;
          onlyValue = keyValue;
          if (!expectedKeys.has(key)) {
            return undefined;
          }
        }
        if (definedFieldCount !== 1 || onlyKey == null) {
          return undefined;
        }
        // GraphQL.js also rejects when another declared field has an inherited
        // defined value (Object.keys only sees own keys).
        for (const field of fieldEntries) {
          if (field.name === onlyKey) {
            continue;
          }
          let otherValue: unknown;
          try {
            otherValue = obj[field.name];
          } catch (error) {
            return thrownCoerceResult(error);
          }
          if (otherValue !== undefined) {
            return undefined;
          }
        }
        const field = fieldEntries.find(f => f.name === onlyKey);
        if (field == null) {
          return undefined;
        }
        // V03: coerce the value already read for `onlyKey` (no second getter hit).
        const coercedField = field.coerce(onlyValue);
        if (coercedField === INPUT_COERCE_DEFER) {
          return INPUT_COERCE_DEFER;
        }
        if (isThrownCoerceResult(coercedField)) {
          return coercedField;
        }
        if (coercedField === undefined || coercedField == null) {
          return undefined;
        }
        const out = newCoercedObject();
        out[onlyKey] = coercedField;
        return out;
      };
      completed = coercer;
      cache.set(type, coercer);
      return coercer;
    }

    const coercer: InputValueCoercer = raw => {
      if (raw == null) {
        return null;
      }
      if (typeof raw !== 'object' || Array.isArray(raw)) {
        return undefined;
      }
      const obj = raw as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (!expectedKeys.has(key)) {
          return undefined;
        }
      }
      const out = newCoercedObject();
      for (const field of fieldEntries) {
        // Property access (not hasOwnProperty) , prototype getters (#6).
        let fieldValue: unknown;
        try {
          fieldValue = obj[field.name];
        } catch (error) {
          return thrownCoerceResult(error);
        }
        if (fieldValue === undefined) {
          if (field.hasDefault) {
            out[field.name] = field.defaultValue;
            continue;
          }
          if (field.nonNull) {
            return undefined;
          }
          continue;
        }
        const coercedField = field.coerce(fieldValue);
        if (coercedField === INPUT_COERCE_DEFER) {
          return INPUT_COERCE_DEFER;
        }
        if (isThrownCoerceResult(coercedField)) {
          return coercedField;
        }
        if (coercedField === undefined) {
          return undefined;
        }
        out[field.name] = coercedField;
      }
      return out;
    };
    completed = coercer;
    cache.set(type, coercer);
    return coercer;
  }

  return null;
}

function getInputFieldDefaultValue(field: {
  type: GraphQLInputType;
  defaultValue?: unknown;
  default?: { literal?: ValueNode; value?: unknown };
}): unknown | undefined {
  if (field.defaultValue !== undefined) {
    // GraphQL 16 (and legacy) schema defaults are already coerced values.
    return field.defaultValue;
  }
  if (field.default == null) {
    return undefined;
  }
  // GraphQL 17 value-form defaults (`default: { value }`) must be coerced
  // against the field type (e.g. `5` for `[Int]` → `[5]`).
  if (Object.prototype.hasOwnProperty.call(field.default, 'value')) {
    return coerceInputValue(field.default.value, field.type);
  }
  if (field.default.literal != null) {
    const compiled = coerceDefaultLiteral(field.default.literal, field.type);
    if (compiled !== undefined) {
      return compiled;
    }
  }
  return undefined;
}

/**
 * Apply a plan-held variable default for one execution. AST defaults are
 * re-coerced from the literal so custom scalars (Date, etc.) return a fresh
 * instance instead of sharing a mutable plan-held value.
 *
 * Returns `undefined` when current coercion rejects the literal so callers
 * miss to getVariableValues instead of reusing the plan-held accepted value.
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
  // Preserve custom scalar instances (Date, etc.) when no AST literal remains
  // to re-parse. Only deep-clone plain / null-prototype maps.
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
 * without retrying the accessor (getVariableValues would re-read). GraphQL 17
 * treats own `undefined` as missing.
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
  /** Variable AST node for GraphQLError locations. */
  variableDef: VariableDefinitionNode;
  /** Plan-held missing/null messages when `nonNull` (#11). */
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

function tryCoerceBuiltinLeafVariables(
  bindings: ReadonlyArray<BuiltinLeafVariableBinding>,
  rawVariableValues: { readonly [key: string]: unknown } | null | undefined,
  hideSuggestions?: boolean | null,
): VariableValues | VariableCoerceMissErrors | undefined {
  const raw = rawVariableValues ?? EMPTY_RAW_VARIABLES;
  const coerced = newCoercedObject();
  const sources = Object.create(null) as VariableValues['sources'];
  // P1-05: collect NonNull missing/null errors like classic maxErrors aggregation.
  const aggregated: GraphQLError[] = [];
  for (const binding of bindings) {
    const signature = {
      name: binding.name,
      type: binding.variableType,
      default: binding.hasDefault ? { literal: binding.defaultLiteral } : undefined,
    };
    const read = readRawVariable(raw, binding.name);
    if (read.kind === 'thrown') {
      return {
        errors: [...aggregated, ...errorsFromThrownCoerce(thrownCoerceResult(read.error))],
      };
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
        coerced[binding.name] = materialized;
        continue;
      }
      if (binding.nonNull) {
        const parts = binding.nonNullErrors!;
        aggregated.push(new GraphQLError(parts.missingMessage, { nodes: parts.nodes }));
        continue;
      }
      continue;
    }
    const value = read.value;
    sources[binding.name] = { signature, value };
    if (value == null) {
      if (binding.nonNull) {
        const parts = binding.nonNullErrors!;
        aggregated.push(new GraphQLError(parts.nullMessage, { nodes: parts.nodes }));
        continue;
      }
      if (aggregated.length === 0) {
        coerced[binding.name] = null;
      }
      continue;
    }
    if (aggregated.length > 0) {
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
          return {
            errors: [
              diagnoseLeafParseMiss(
                binding.name,
                leaf,
                value,
                binding.variableDef,
                hideSuggestions,
              ),
            ],
          };
        }
      } else {
        parsed = binding.leafType.parseValue(value);
      }
    } catch {
      return {
        errors: [
          diagnoseLeafParseMiss(
            binding.name,
            binding.leafType,
            value,
            binding.variableDef,
            hideSuggestions,
          ),
        ],
      };
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
        return { errors: diagnosed };
      }
      return undefined;
    }
    coerced[binding.name] = parsed;
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
    maxErrors: 50,
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
