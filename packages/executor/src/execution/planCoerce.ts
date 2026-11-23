import {
  getVariableValues,
  GraphQLError,
  GraphQLLeafType,
  GraphQLSchema,
  isInputObjectType,
  isInputType,
  isLeafType,
  isListType,
  isNonNullType,
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

function coerceDefaultLiteral(literal: ValueNode, type: GraphQLInputType): unknown {
  // valueFromAST shares this module's graphql instance (avoid require()-ing a
  // second copy under vitest). Custom GraphQL 17 scalars that only normalize
  // via coerceInputLiteral fall through to getVariableValues when the fast
  // path cannot compile the default (tryCompile* returns undefined).
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

  const inputBindings = tryCompileHoistedVariableBindings(schema, variableDefinitions);
  if (inputBindings == null) {
    return runFull;
  }

  return (rawVariableValues, options) => {
    const fast = tryCoerceHoistedVariables(
      inputBindings,
      rawVariableValues,
      options?.hideSuggestions,
    );
    if (fast !== undefined) {
      return 'errors' in fast ? fast : { variableValues: fast };
    }
    return runFull(rawVariableValues, options);
  };
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
  const coerced = Object.create(null) as Record<string, unknown>;
  const sources = Object.create(null) as VariableValues['sources'];
  for (const binding of bindings) {
    const signature = {
      name: binding.name,
      type: binding.variableType,
      default: binding.hasDefault ? { literal: binding.defaultLiteral } : undefined,
    };
    const read = readRawVariable(raw, binding.name);
    if (read.kind === 'fallback') {
      return undefined;
    }
    if (read.kind === 'missing') {
      sources[binding.name] = { signature };
      if (binding.hasDefault) {
        coerced[binding.name] = clonePlanDefaultValue(binding.defaultValue);
        continue;
      }
      if (binding.nonNull) {
        // Fall through to getVariableValues so all missing vars are reported.
        return undefined;
      }
      continue;
    }
    const value = read.value;
    sources[binding.name] = { signature, value };
    if (value == null && binding.nonNull) {
      const parts = binding.nonNullErrors!;
      return {
        errors: [new GraphQLError(parts.nullMessage, { nodes: parts.nodes })],
      };
    }
    const coercedValue = binding.coerce(value);
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
      // graphql-js: arrays as-is; other iterables expand; else singleton wrap.
      const list = Array.isArray(raw) ? raw : isIterableObject(raw) ? Array.from(raw) : [raw];
      const out: unknown[] = [];
      for (let i = 0; i < list.length; i++) {
        const item = itemCoercer(list[i]);
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
    // Placeholder enables recursive input objects during field compile.
    const placeholder: InputValueCoercer = () => undefined;
    cache.set(type, placeholder);

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
        for (const key of Object.keys(obj)) {
          if (obj[key] === undefined) {
            continue;
          }
          definedFieldCount++;
          onlyKey = key;
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
          if (field.name !== onlyKey && obj[field.name] !== undefined) {
            return undefined;
          }
        }
        const field = fieldEntries.find(f => f.name === onlyKey);
        if (field == null) {
          return undefined;
        }
        const coercedField = field.coerce(obj[onlyKey]);
        if (coercedField === undefined || coercedField == null) {
          return undefined;
        }
        const out = Object.create(null) as Record<string, unknown>;
        out[onlyKey] = coercedField;
        return out;
      };
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
      const out = Object.create(null) as Record<string, unknown>;
      for (const field of fieldEntries) {
        // Property access (not hasOwnProperty) , prototype getters (#6).
        const fieldValue = obj[field.name];
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
        if (coercedField === undefined) {
          return undefined;
        }
        out[field.name] = coercedField;
      }
      return out;
    };
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
    return field.defaultValue;
  }
  if (field.default == null) {
    return undefined;
  }
  // GraphQL 17 value-form defaults (`default: { value }`).
  if (Object.prototype.hasOwnProperty.call(field.default, 'value')) {
    return field.default.value;
  }
  if (field.default.literal != null) {
    const compiled = coerceDefaultLiteral(field.default.literal, field.type);
    if (compiled !== undefined) {
      return compiled;
    }
  }
  return undefined;
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
  const src = value as Record<string, unknown>;
  const out = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(src)) {
    out[key] = clonePlanDefaultValue(src[key]);
  }
  return out;
}

/**
 * Read one variable from the raw map. Getter throws fall back to classic
 * getVariableValues (undefined). GraphQL 17 treats own `undefined` as missing.
 */
function readRawVariable(
  raw: { readonly [key: string]: unknown },
  name: string,
): { kind: 'missing' } | { kind: 'value'; value: unknown } | { kind: 'fallback' } {
  let supplied: boolean;
  let value: unknown;
  try {
    supplied = Object.prototype.hasOwnProperty.call(raw, name);
    if (supplied) {
      value = raw[name];
    }
  } catch {
    return { kind: 'fallback' };
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
  const coerced = Object.create(null) as Record<string, unknown>;
  const sources = Object.create(null) as VariableValues['sources'];
  for (const binding of bindings) {
    const signature = {
      name: binding.name,
      type: binding.variableType,
      default: binding.hasDefault ? { literal: binding.defaultLiteral } : undefined,
    };
    const read = readRawVariable(raw, binding.name);
    if (read.kind === 'fallback') {
      return undefined;
    }
    if (read.kind === 'missing') {
      sources[binding.name] = { signature };
      if (binding.hasDefault) {
        coerced[binding.name] = clonePlanDefaultValue(binding.defaultValue);
        continue;
      }
      if (binding.nonNull) {
        // Fall through to getVariableValues so all missing vars are reported.
        return undefined;
      }
      continue;
    }
    const value = read.value;
    sources[binding.name] = { signature, value };
    if (value == null) {
      if (binding.nonNull) {
        const parts = binding.nonNullErrors!;
        return {
          errors: [new GraphQLError(parts.nullMessage, { nodes: parts.nodes })],
        };
      }
      coerced[binding.name] = null;
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
