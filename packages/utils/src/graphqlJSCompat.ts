import { GraphQLScalarType, Kind, versionInfo } from 'graphql';

const isGraphQLJS17OrAbove = versionInfo.major >= 17;

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
 * graphql-js@17's `getArgumentValues` expects `variableValues` as
 * `{ coerced, sources }`. Flat maps are wrapped only on graphql-js >= 17.
 *
 * When the executor already built real `sources`, pass them through. Otherwise
 * build synthetic sources from the flat map on each call (not memoized by
 * object identity) so mutating and reusing the same map stays correct.
 */
export function toGraphQLJSVariableValues(
  variableValues: any,
  variableSources?: Record<string, unknown>,
): any {
  if (variableValues == null || !isGraphQLJS17OrAbove) {
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
