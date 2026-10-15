import { GraphQLScalarType, Kind } from 'graphql';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- namespace import only used to read optional graphql-js@17+ exports (`coerceInputLiteral` / `coerceInputValue`), not the restricted names
import * as GraphQLJS from 'graphql';

type CoerceInputLiteral = (
  valueNode: any,
  type: any,
  variableValues?: any,
  fragmentVariableValues?: any,
) => unknown;

type CoerceInputValue = (inputValue: unknown, type: any) => unknown;

/**
 * graphql-js@17+ input-literal coercion. `undefined` on older peers where the
 * export does not exist.
 */
export const coerceInputLiteral: CoerceInputLiteral | undefined =
  typeof (GraphQLJS as any).coerceInputLiteral === 'function'
    ? (GraphQLJS as any).coerceInputLiteral
    : undefined;

/**
 * graphql-js@17+ input-value coercion (paired with `coerceInputLiteral`).
 * Left unset on older peers so we do not call the graphql 15/16
 * `coerceInputValue(value, type, onError)` signature by mistake.
 */
export const coerceInputValue: CoerceInputValue | undefined = coerceInputLiteral
  ? (GraphQLJS as any).coerceInputValue
  : undefined;

// Converts an arbitrary runtime value to a GraphQL AST literal, used only as
// `anyValueType`'s `valueToLiteral` below. graphql-js@17's own generic fallback
// (`defaultScalarValueToLiteral`, not part of its public API so it can't be
// reused directly) only serializes an object's own enumerable properties,
// which silently drops data for values like `Date` (whose contents live in
// methods, not own properties) instead of erroring — so this mirrors it but
// special-cases `.toJSON()` first, the same convention `JSON.stringify` uses,
// so such values round-trip instead of flattening to `{}`.
function valueToASTLiteral(value: unknown): any {
  if (value == null) {
    return { kind: Kind.NULL };
  }
  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  }
  if (typeof value === 'string') {
    return { kind: Kind.STRING, value, block: false };
  }
  if (typeof value === 'bigint') {
    return { kind: Kind.INT, value: value.toString() };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { kind: Kind.NULL };
    }
    // `Number.isInteger(1e21)` is true, but `String(1e21)` is `"1e+21"`, which
    // is not a valid IntValue. Choose the AST kind from the serialized form,
    // matching `astFromValueUntyped`.
    const stringNum = String(value);
    return integerStringRegExp.test(stringNum)
      ? { kind: Kind.INT, value: stringNum }
      : { kind: Kind.FLOAT, value: stringNum };
  }
  if (typeof value === 'object') {
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      return valueToASTLiteral((value as { toJSON(): unknown }).toJSON());
    }
    if (Symbol.iterator in (value as object)) {
      return {
        kind: Kind.LIST,
        values: Array.from(value as Iterable<unknown>, valueToASTLiteral),
      };
    }
    const fields: Array<Record<string, unknown>> = [];
    for (const [fieldName, fieldValue] of Object.entries(value)) {
      if (fieldValue !== undefined) {
        fields.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: fieldName },
          value: valueToASTLiteral(fieldValue),
        });
      }
    }
    return { kind: Kind.OBJECT, fields };
  }
  // Functions, symbols, etc. have no literal representation.
  return { kind: Kind.NULL };
}

// A throwaway scalar type used only as `sources[varName].signature.type` below.
// graphql-js@17's `valueToLiteral` (invoked internally to resolve a variable
// nested inside an object/list literal argument, e.g. when a custom scalar
// implements its own `coerceInputLiteral`) special-cases NonNull/List/InputObject
// types but otherwise defers entirely to the leaf type's own `valueToLiteral`.
// This package only has each variable's already-coerced runtime value at this
// point, not its declared `GraphQLInputType` (that would require threading the
// operation's variable definitions through every call site), so this bare
// scalar supplies a type-agnostic `valueToLiteral` that works for any runtime
// value regardless of the variable's real declared type.
// `serialize` is required when constructing scalars on graphql-js@14.
const anyValueType = new GraphQLScalarType({
  name: '_GraphQLToolsAnyValue',
  serialize: (value: unknown) => value,
  valueToLiteral: valueToASTLiteral,
} as any);

function buildVariableSources(variableValues: Record<string, any>): Record<string, unknown> {
  const sources: Record<string, unknown> = Object.create(null);
  for (const varName of Object.keys(variableValues)) {
    sources[varName] = { signature: { type: anyValueType }, value: variableValues[varName] };
  }
  return sources;
}

/**
 * When calling graphql-js@17 `coerceInputLiteral`, `variableValues` must be the
 * structured `{ coerced, sources }` shape. This package deals in flat maps
 * everywhere else, so wrap them only when that API is present.
 *
 * When the executor already built real `sources` (with each variable's declared
 * input type and original input value), pass them through so nested variables
 * round-trip via the declared type's `valueToLiteral`. Callers that only have a
 * flat map get synthetic sources rebuilt on every call (not memoized by object
 * identity), so mutating and reusing the same map stays correct.
 */
export function toGraphQLJSVariableValues(
  variableValues: any,
  variableSources?: Record<string, unknown>,
): any {
  if (variableValues == null || coerceInputLiteral == null) {
    return variableValues;
  }
  if (variableSources) {
    return { coerced: variableValues, sources: variableSources };
  }
  return {
    coerced: variableValues,
    sources: buildVariableSources(variableValues),
  };
}

/**
 * IntValue:
 *   - NegativeSign? 0
 *   - NegativeSign? NonZeroDigit ( Digit+ )?
 */
const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
