import { GraphQLScalarType, Kind, versionInfo } from 'graphql';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- namespace import only used for optional access to exports introduced in newer graphql-js versions than this package's supported range, not the restricted names
import * as GraphQLJS from 'graphql';
import { memoize1 } from './memoize.js';

type GraphQLJSModule = typeof import('graphql');

// Safe stand-in for graphql-js versions where a given export isn't declared at
// all, so calling the looked-up value as a function still type-checks; the
// runtime feature-detection below is what actually guards whether the export
// exists, not this type.
type UnknownFunction = (...args: any[]) => any;

/**
 * Looks up an export that only exists on newer graphql-js versions than the
 * range this package supports (e.g. `coerceInputLiteral`/`validateInputValue`,
 * both introduced in graphql-js@17), returning `undefined` on older versions
 * where the export doesn't exist yet. The type is read directly off
 * graphql-js's own declarations for whichever version is currently installed,
 * instead of a hand-written signature that could drift out of sync.
 */
export function getOptionalGraphQLJSExport<Name extends string>(
  name: Name,
): (Name extends keyof GraphQLJSModule ? GraphQLJSModule[Name] : UnknownFunction) | undefined {
  return (GraphQLJS as Record<string, unknown>)[name] as any;
}

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
    return Number.isInteger(value)
      ? { kind: Kind.INT, value: String(value) }
      : { kind: Kind.FLOAT, value: String(value) };
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
const anyValueType = new GraphQLScalarType({
  name: '_GraphQLToolsAnyValue',
  valueToLiteral: valueToASTLiteral,
} as any);

function buildVariableSources(variableValues: Record<string, any>): Record<string, unknown> {
  const sources: Record<string, unknown> = Object.create(null);
  for (const varName of Object.keys(variableValues)) {
    sources[varName] = { signature: { type: anyValueType }, value: variableValues[varName] };
  }
  return sources;
}

// `variableValues` is the same object reference for the lifetime of a single
// execution (or, in `getArgumentValues.ts`'s case, a single call), so memoize
// the wrapper by reference instead of reallocating `{ coerced, sources }` on
// every call site that needs it (once per AST node during selection-set
// collection, once per resolved field during execution).
const wrapVariableValues = memoize1((variableValues: Record<string, any>) => ({
  coerced: variableValues,
  sources: buildVariableSources(variableValues),
}));

/**
 * graphql-js@17's built-in `getDirectiveValues`/`getArgumentValues` expect
 * `variableValues` as the structured `{ coerced, sources }` shape rather than
 * a flat map of variable name to value. This package deals in flat maps
 * everywhere else, so wrap them right before handing them to graphql-js's own
 * (unforked) directive-argument coercion, only for graphql-js >= 17.
 */
export function toGraphQLJSVariableValues(variableValues: any): any {
  if (variableValues == null || !isGraphQLJS17OrAbove) {
    return variableValues;
  }
  return wrapVariableValues(variableValues);
}
