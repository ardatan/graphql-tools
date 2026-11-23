/**
 * Plan-held GraphQLError factories for variable coerce misses (Stage C leftovers
 * #1–#3/#6): enum Did-you-mean / hideSuggestions, unknown keys, nested
 * multi-error paths, and graphql-js field-access semantics (prototype getters).
 */
import {
  GraphQLError,
  GraphQLInputType,
  isEnumType,
  isInputObjectType,
  isLeafType,
  isListType,
  isNonNullType,
  versionInfo,
  type GraphQLEnumType,
  type VariableDefinitionNode,
} from 'graphql';
import { didYouMean } from 'graphql/jsutils/didYouMean.js';
import { suggestionList } from 'graphql/jsutils/suggestionList.js';

const isGraphQL17 = versionInfo.major >= 17;

/** Cap matches graphql-js getVariableValues default maxErrors. */
const MAX_COERCE_ERRORS = 50;

/**
 * graphql-js `inspect` quote style (JSON strings) for GraphQLError message parity.
 */
export function inspectValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(inspectValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    return `{ ${entries.map(([k, v]) => `${k}: ${inspectValue(v)}`).join(', ')} }`;
  }
  return String(value);
}

/** GQL17: ` at .na` / ` at [1]`. */
function printPathGql17(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) {
    return '';
  }
  let out = '';
  for (const key of path) {
    out += typeof key === 'number' ? `[${key}]` : `.${key}`;
  }
  return ` at ${out}`;
}

/** GQL16: ` at "input.na"` / ` at "input[1]"`. */
function printPathGql16(varName: string, path: ReadonlyArray<string | number>): string {
  if (path.length === 0) {
    return '';
  }
  let s = varName;
  for (const key of path) {
    s += typeof key === 'number' ? `[${key}]` : `.${key}`;
  }
  return ` at "${s}"`;
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasInputFieldDefault(field: {
  defaultValue?: unknown;
  default?: { literal?: unknown };
}): boolean {
  if (field.defaultValue !== undefined) {
    return true;
  }
  return field.default?.literal != null;
}

/**
 * Diagnose a hoisted/builtin coerce miss into plan-held GraphQLErrors.
 */
export function diagnoseVariableCoerceMiss(
  varName: string,
  variableType: GraphQLInputType,
  value: unknown,
  nodes: VariableDefinitionNode,
  hideSuggestions?: boolean | null,
): ReadonlyArray<GraphQLError> | undefined {
  const hide = hideSuggestions === true;
  const errors: GraphQLError[] = [];
  if (isGraphQL17) {
    diagnoseGql17(varName, variableType, value, [], nodes, hide, errors);
  } else {
    diagnoseGql16(varName, variableType, value, [], nodes, hide, errors);
  }
  return errors.length > 0 ? errors : undefined;
}

function pushGql17(
  errors: GraphQLError[],
  varName: string,
  path: ReadonlyArray<string | number>,
  nodes: VariableDefinitionNode,
  detail: string,
  originalError?: Error | GraphQLError | null,
): void {
  if (errors.length >= MAX_COERCE_ERRORS) {
    return;
  }
  errors.push(
    new GraphQLError(`Variable "$${varName}" has invalid value${printPathGql17(path)}: ${detail}`, {
      nodes,
      originalError: originalError ?? undefined,
    }),
  );
}

function diagnoseGql17(
  varName: string,
  type: GraphQLInputType,
  value: unknown,
  path: Array<string | number>,
  nodes: VariableDefinitionNode,
  hide: boolean,
  errors: GraphQLError[],
): void {
  if (errors.length >= MAX_COERCE_ERRORS) {
    return;
  }

  if (isNonNullType(type)) {
    if (value === undefined) {
      pushGql17(
        errors,
        varName,
        path,
        nodes,
        `Expected a value of non-null type "${String(type)}" to be provided.`,
      );
      return;
    }
    if (value === null) {
      pushGql17(
        errors,
        varName,
        path,
        nodes,
        `Expected value of non-null type "${String(type)}" not to be null.`,
      );
      return;
    }
    diagnoseGql17(varName, type.ofType, value, path, nodes, hide, errors);
    return;
  }

  if (value == null) {
    return;
  }

  if (isListType(type)) {
    // graphql-js wraps singular non-iterable values as a one-element list.
    if (!Array.isArray(value)) {
      diagnoseGql17(varName, type.ofType, value, path, nodes, hide, errors);
      return;
    }
    for (let i = 0; i < value.length; i++) {
      diagnoseGql17(varName, type.ofType, value[i], [...path, i], nodes, hide, errors);
      if (errors.length >= MAX_COERCE_ERRORS) return;
    }
    return;
  }

  if (isInputObjectType(type)) {
    if (!isObjectLike(value) || Array.isArray(value)) {
      pushGql17(
        errors,
        varName,
        path,
        nodes,
        `Expected value of type "${type.name}" to be an object, found: ${inspectValue(value)}.`,
      );
      return;
    }
    const fields = type.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName]!;
      // Property access — prototype getters (#6).
      const fieldValue = value[fieldName];
      if (fieldValue === undefined) {
        if (!hasInputFieldDefault(field) && isNonNullType(field.type)) {
          pushGql17(
            errors,
            varName,
            path,
            nodes,
            `Expected value of type "${type.name}" to include required field "${fieldName}", found: ${inspectValue(value)}.`,
          );
        }
      } else {
        diagnoseGql17(varName, field.type, fieldValue, [...path, fieldName], nodes, hide, errors);
      }
      if (errors.length >= MAX_COERCE_ERRORS) return;
    }
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) continue;
      if (!Object.prototype.hasOwnProperty.call(fields, key)) {
        const suggestions = hide ? [] : suggestionList(key, Object.keys(fields));
        const suggestion = suggestions.length > 0 ? didYouMean(suggestions) : '';
        const detail = suggestion
          ? `Expected value of type "${type.name}" not to include unknown field "${key}".${suggestion} Found: ${inspectValue(value)}.`
          : `Expected value of type "${type.name}" not to include unknown field "${key}", found: ${inspectValue(value)}.`;
        pushGql17(errors, varName, path, nodes, detail);
      }
      if (errors.length >= MAX_COERCE_ERRORS) return;
    }
    if (type.isOneOf === true) {
      const defined: string[] = [];
      for (const key of Object.keys(value)) {
        if (value[key] !== undefined && Object.prototype.hasOwnProperty.call(fields, key)) {
          defined.push(key);
        }
      }
      if (defined.length !== 1) {
        pushGql17(
          errors,
          varName,
          path,
          nodes,
          `Exactly one key must be specified for OneOf type "${type.name}".`,
        );
      } else if (value[defined[0]!] === null) {
        pushGql17(
          errors,
          varName,
          [...path, defined[0]!],
          nodes,
          `Field "${defined[0]}" must be non-null.`,
        );
      }
    }
    return;
  }

  if (isLeafType(type)) {
    const invalid = leafInvalid(type, value, hide);
    if (invalid != null) {
      pushGql17(errors, varName, path, nodes, invalid.detail, invalid.originalError);
    }
  }
}

type LeafInvalid = { detail: string; originalError?: Error | GraphQLError };

function leafInvalid(
  type: {
    parseValue: (v: unknown) => unknown;
    coerceInputValue?: (v: unknown, hide?: boolean | null) => unknown;
    name: string;
  },
  value: unknown,
  hide: boolean,
): LeafInvalid | undefined {
  try {
    if (typeof type.coerceInputValue === 'function') {
      const result = type.coerceInputValue(value, hide);
      if (result === undefined) {
        return {
          detail: `Expected value of type "${type.name}", found: ${inspectValue(value)}.`,
        };
      }
      return undefined;
    }
    type.parseValue(value);
    return undefined;
  } catch (err) {
    let detail = err instanceof Error ? err.message : String(err);
    if (hide) {
      detail = detail.replace(/\s*Did you mean[^?]*\?/, '');
    } else if (isEnumType(type as GraphQLEnumType) && !/Did you mean/.test(detail)) {
      const values = (type as GraphQLEnumType).getValues().map(v => v.name);
      if (typeof value === 'string') {
        const suggestions = suggestionList(value, values);
        const suggestion = suggestions.length > 0 ? didYouMean('the enum value', suggestions) : '';
        if (suggestion) {
          detail = detail.replace(/\.$/, '') + suggestion;
        }
      }
    }
    return {
      detail,
      originalError: err instanceof Error ? err : undefined,
    };
  }
}

function diagnoseGql16(
  varName: string,
  type: GraphQLInputType,
  value: unknown,
  path: Array<string | number>,
  nodes: VariableDefinitionNode,
  hide: boolean,
  errors: GraphQLError[],
): void {
  if (errors.length >= MAX_COERCE_ERRORS) {
    return;
  }

  if (isNonNullType(type)) {
    if (value == null) {
      const pathStr = printPathGql16(varName, path);
      const shown = inspectValue(value);
      const msg =
        path.length === 0
          ? `Variable "$${varName}" got invalid value ${shown}; Expected non-nullable type "${String(type)}" not to be null.`
          : `Variable "$${varName}" got invalid value ${shown}${pathStr}; Expected non-nullable type "${String(type)}" not to be null.`;
      errors.push(new GraphQLError(msg, { nodes }));
      return;
    }
    diagnoseGql16(varName, type.ofType, value, path, nodes, hide, errors);
    return;
  }

  if (value == null) {
    return;
  }

  if (isListType(type)) {
    const list = Array.isArray(value) ? value : [value];
    for (let i = 0; i < list.length; i++) {
      diagnoseGql16(varName, type.ofType, list[i], [...path, i], nodes, hide, errors);
      if (errors.length >= MAX_COERCE_ERRORS) return;
    }
    return;
  }

  if (isInputObjectType(type)) {
    if (!isObjectLike(value) || Array.isArray(value)) {
      errors.push(
        new GraphQLError(
          `Variable "$${varName}" got invalid value ${inspectValue(value)}; Expected type "${type.name}" to be an object.`,
          { nodes },
        ),
      );
      return;
    }
    const fields = type.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName]!;
      const fieldValue = value[fieldName];
      if (fieldValue === undefined) {
        if (!hasInputFieldDefault(field) && isNonNullType(field.type)) {
          const pathStr = printPathGql16(varName, path);
          const classic =
            path.length === 0
              ? `Variable "$${varName}" got invalid value ${inspectValue(value)}; Field "${fieldName}" of required type "${String(field.type)}" was not provided.`
              : `Variable "$${varName}" got invalid value ${inspectValue(value)}${pathStr}; Field "${fieldName}" of required type "${String(field.type)}" was not provided.`;
          errors.push(new GraphQLError(classic, { nodes }));
        }
      } else {
        diagnoseGql16(varName, field.type, fieldValue, [...path, fieldName], nodes, hide, errors);
      }
      if (errors.length >= MAX_COERCE_ERRORS) return;
    }
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) continue;
      if (!Object.prototype.hasOwnProperty.call(fields, key)) {
        errors.push(
          new GraphQLError(
            `Variable "$${varName}" got invalid value ${inspectValue(value)}; Field "${key}" is not defined by type "${type.name}".`,
            { nodes },
          ),
        );
      }
      if (errors.length >= MAX_COERCE_ERRORS) return;
    }
    return;
  }

  if (isLeafType(type)) {
    const invalid = leafInvalid(type, value, hide);
    if (invalid != null) {
      const pathStr = printPathGql16(varName, path);
      const message =
        path.length === 0
          ? `Variable "$${varName}" got invalid value ${inspectValue(value)}; ${invalid.detail}`
          : `Variable "$${varName}" got invalid value ${inspectValue(value)}${pathStr}; ${invalid.detail}`;
      errors.push(new GraphQLError(message, { nodes, originalError: invalid.originalError }));
    }
  }
}

/**
 * Leaf parseValue / coerceInputValue miss → single GraphQLError (builtin-leaf path).
 */
export function diagnoseLeafParseMiss(
  varName: string,
  leafType: {
    parseValue: (v: unknown) => unknown;
    coerceInputValue?: (v: unknown, hide?: boolean | null) => unknown;
    name: string;
  },
  value: unknown,
  nodes: VariableDefinitionNode,
  hideSuggestions?: boolean | null,
): GraphQLError {
  const invalid = leafInvalid(leafType, value, hideSuggestions === true) ?? {
    detail: `Expected value of type "${leafType.name}"`,
  };
  if (isGraphQL17) {
    return new GraphQLError(`Variable "$${varName}" has invalid value: ${invalid.detail}`, {
      nodes,
      originalError: invalid.originalError,
    });
  }
  return new GraphQLError(
    `Variable "$${varName}" got invalid value ${inspectValue(value)}; ${invalid.detail}`,
    { nodes, originalError: invalid.originalError },
  );
}
