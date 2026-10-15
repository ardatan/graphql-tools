import { inspect } from 'cross-inspect';
import {
  assertLeafType,
  GraphQLInputType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isRequiredInputField,
  Kind,
  ObjectFieldNode,
  ValueNode,
} from 'graphql';
import { createGraphQLError } from './errors.js';
import { hasOwnProperty, isIterableObject, isObjectLike } from './jsutils.js';

/**
 * Local copies of graphql-js@17 input coercion helpers (`coerceInputValue`,
 * `coerceInputLiteral`, `coerceDefaultValue`, `replaceVariables`) so this
 * package does not optionally import those exports (which are absent on older
 * peers and break static bundlers). Behavior tracks graphql-js 17.0.2.
 */

type VariableValues = {
  coerced: Record<string, unknown>;
  sources: Record<string, any>;
};

type InputWithDefault = {
  type: GraphQLInputType;
  default?: { literal?: ValueNode; value?: unknown };
  defaultValue?: unknown;
  _memoizedCoercedDefaultValue?: unknown;
};

export function coerceInputValue(inputValue: unknown, type: GraphQLInputType): unknown {
  if (isNonNullType(type)) {
    if (inputValue == null) {
      return;
    }
    return coerceInputValue(inputValue, type.ofType);
  }
  if (inputValue == null) {
    return null;
  }
  if (isListType(type)) {
    if (!isIterableObject(inputValue)) {
      const coercedItem = coerceInputValue(inputValue, type.ofType);
      if (coercedItem === undefined) {
        return;
      }
      return [coercedItem];
    }
    const coercedValue: unknown[] = [];
    for (const itemValue of inputValue) {
      const coercedItem = coerceInputValue(itemValue, type.ofType);
      if (coercedItem === undefined) {
        return;
      }
      coercedValue.push(coercedItem);
    }
    return coercedValue;
  }
  if (isInputObjectType(type)) {
    if (!isObjectLike(inputValue) || Array.isArray(inputValue)) {
      return;
    }
    const coercedValue: Record<string, unknown> = Object.create(null);
    const fieldDefs = type.getFields();
    let definedFieldCount = 0;
    for (const fieldName of Object.keys(inputValue)) {
      if (inputValue[fieldName] === undefined) {
        continue;
      }
      definedFieldCount++;
      if (!hasOwnProperty(fieldDefs, fieldName)) {
        return;
      }
    }
    for (const field of Object.values(fieldDefs)) {
      const fieldValue = inputValue[field.name];
      if (fieldValue === undefined) {
        if (isRequiredInputField(field)) {
          return;
        }
        const coercedDefaultValue = coerceDefaultValue(field as InputWithDefault);
        if (coercedDefaultValue !== undefined) {
          coercedValue[field.name] = coercedDefaultValue;
        }
      } else {
        const coercedField = coerceInputValue(fieldValue, field.type);
        if (coercedField === undefined) {
          return;
        }
        coercedValue[field.name] = coercedField;
      }
    }
    if ((type as { isOneOf?: boolean }).isOneOf) {
      const keys = Object.keys(coercedValue);
      if (definedFieldCount !== 1 || keys.length !== 1) {
        return;
      }
      const key = keys[0];
      if (coercedValue[key] === null) {
        return;
      }
    }
    return coercedValue;
  }
  const leafType = assertLeafType(type) as any;
  try {
    return typeof leafType.coerceInputValue === 'function'
      ? leafType.coerceInputValue(inputValue)
      : leafType.parseValue(inputValue);
  } catch {
    
  }
}

export function coerceInputLiteral(
  valueNode: ValueNode,
  type: GraphQLInputType,
  variableValues?: VariableValues,
  fragmentVariableValues?: VariableValues,
): unknown {
  if (valueNode.kind === Kind.VARIABLE) {
    const coercedVariableValue = getCoercedVariableValue(
      valueNode,
      variableValues,
      fragmentVariableValues,
    );
    if (coercedVariableValue == null && isNonNullType(type)) {
      return;
    }
    return coercedVariableValue;
  }
  if (isNonNullType(type)) {
    if (valueNode.kind === Kind.NULL) {
      return;
    }
    return coerceInputLiteral(valueNode, type.ofType, variableValues, fragmentVariableValues);
  }
  if (valueNode.kind === Kind.NULL) {
    return null;
  }
  if (isListType(type)) {
    if (valueNode.kind !== Kind.LIST) {
      const itemValue = coerceInputLiteral(
        valueNode,
        type.ofType,
        variableValues,
        fragmentVariableValues,
      );
      if (itemValue === undefined) {
        return;
      }
      return [itemValue];
    }
    const coercedValue: unknown[] = [];
    for (const itemNode of valueNode.values) {
      let itemValue = coerceInputLiteral(
        itemNode,
        type.ofType,
        variableValues,
        fragmentVariableValues,
      );
      if (itemValue === undefined) {
        if (
          itemNode.kind === Kind.VARIABLE &&
          getCoercedVariableValue(itemNode, variableValues, fragmentVariableValues) == null &&
          !isNonNullType(type.ofType)
        ) {
          itemValue = null;
        } else {
          return;
        }
      }
      coercedValue.push(itemValue);
    }
    return coercedValue;
  }
  if (isInputObjectType(type)) {
    if (valueNode.kind !== Kind.OBJECT) {
      return;
    }
    const coercedValue: Record<string, unknown> = Object.create(null);
    const fieldDefs = type.getFields();
    const hasUndefinedField = valueNode.fields.some(
      field => !hasOwnProperty(fieldDefs, field.name.value),
    );
    if (hasUndefinedField) {
      return;
    }
    const fieldNodes = new Map(valueNode.fields.map(field => [field.name.value, field]));
    for (const field of Object.values(fieldDefs)) {
      const fieldNode = fieldNodes.get(field.name);
      if (
        !fieldNode ||
        (fieldNode.value.kind === Kind.VARIABLE &&
          isMissingVariable(fieldNode.value, variableValues, fragmentVariableValues))
      ) {
        if (isRequiredInputField(field)) {
          return;
        }
        const coercedDefaultValue = coerceDefaultValue(field as InputWithDefault);
        if (coercedDefaultValue !== undefined) {
          coercedValue[field.name] = coercedDefaultValue;
        }
      } else {
        const fieldValue = coerceInputLiteral(
          fieldNode.value,
          field.type,
          variableValues,
          fragmentVariableValues,
        );
        if (fieldValue === undefined) {
          return;
        }
        coercedValue[field.name] = fieldValue;
      }
    }
    if ((type as { isOneOf?: boolean }).isOneOf) {
      const coercedKeys = Object.keys(coercedValue);
      if (fieldNodes.size !== 1 || coercedKeys.length !== 1) {
        return;
      }
      for (const [fieldName, fieldNode] of fieldNodes) {
        if (fieldNode.value.kind === Kind.NULL || coercedValue[fieldName] === null) {
          return;
        }
      }
    }
    return coercedValue;
  }
  const leafType = assertLeafType(type) as any;
  try {
    return typeof leafType.coerceInputLiteral === 'function'
      ? leafType.coerceInputLiteral(
          replaceVariables(valueNode, variableValues, fragmentVariableValues),
        )
      : leafType.parseLiteral(valueNode, variableValues?.coerced);
  } catch {
    
  }
}

function getCoercedVariableValue(
  variableNode: { name: { value: string } },
  variableValues?: VariableValues,
  fragmentVariableValues?: VariableValues,
): unknown {
  const varName = variableNode.name.value;
  if (fragmentVariableValues?.sources[varName] !== undefined) {
    return fragmentVariableValues.coerced[varName];
  }
  return variableValues?.coerced[varName];
}

function isMissingVariable(
  variableNode: { name: { value: string } },
  variableValues?: VariableValues,
  fragmentVariableValues?: VariableValues,
): boolean {
  const varName = variableNode.name.value;
  const scopedValues =
    fragmentVariableValues?.sources[varName] !== undefined
      ? fragmentVariableValues.coerced
      : variableValues?.coerced;
  return scopedValues?.[varName] === undefined;
}

export function coerceDefaultValue(inputValue: InputWithDefault): unknown {
  let coercedDefaultValue = inputValue._memoizedCoercedDefaultValue;
  if (coercedDefaultValue !== undefined) {
    return coercedDefaultValue;
  }
  const defaultInput = inputValue.default;
  if (defaultInput !== undefined) {
    coercedDefaultValue = defaultInput.literal
      ? coerceInputLiteral(defaultInput.literal, inputValue.type)
      : coerceInputValue(defaultInput.value, inputValue.type);
    if (coercedDefaultValue === undefined) {
      throw createGraphQLError(
        `Expected value of type "${inspect(inputValue.type)}" to be valid, found: ${inspect(
          defaultInput.literal ?? defaultInput.value,
        )}.`,
        defaultInput.literal ? { nodes: [defaultInput.literal] } : undefined,
      );
    }
    inputValue._memoizedCoercedDefaultValue = coercedDefaultValue;
    return coercedDefaultValue;
  }
  const defaultValue = inputValue.defaultValue;
  if (defaultValue !== undefined) {
    inputValue._memoizedCoercedDefaultValue = defaultValue;
  }
  return defaultValue;
}

export function replaceVariables(
  valueNode: ValueNode,
  variableValues?: VariableValues,
  fragmentVariableValues?: VariableValues,
): ValueNode {
  switch (valueNode.kind) {
    case Kind.VARIABLE: {
      const varName = valueNode.name.value;
      const fragmentVariableValueSource = fragmentVariableValues?.sources[varName];
      if (fragmentVariableValueSource) {
        const value = fragmentVariableValueSource.value;
        if (value === undefined) {
          const defaultValue = fragmentVariableValueSource.signature?.default;
          if (defaultValue !== undefined) {
            return defaultValue.literal;
          }
          return { kind: Kind.NULL };
        }
        return replaceVariables(
          value,
          variableValues,
          fragmentVariableValueSource.fragmentVariableValues,
        );
      }
      const variableValueSource = variableValues?.sources[varName];
      if (variableValueSource == null) {
        return { kind: Kind.NULL };
      }
      if (variableValueSource.value === undefined) {
        const defaultValue = variableValueSource.signature?.default;
        if (defaultValue !== undefined) {
          return defaultValue.literal;
        }
      }
      return valueToLiteral(variableValueSource.value, variableValueSource.signature.type);
    }
    case Kind.OBJECT: {
      const newFields: ObjectFieldNode[] = [];
      for (const field of valueNode.fields) {
        if (field.value.kind === Kind.VARIABLE) {
          const scopedVariableSource =
            fragmentVariableValues?.sources[field.value.name.value] ??
            variableValues?.sources[field.value.name.value];
          if (
            scopedVariableSource?.value === undefined &&
            scopedVariableSource?.signature?.default === undefined
          ) {
            continue;
          }
        }
        newFields.push({
          ...field,
          value: replaceVariables(field.value, variableValues, fragmentVariableValues),
        });
      }
      return {
        ...valueNode,
        fields: newFields,
      };
    }
    case Kind.LIST: {
      return {
        ...valueNode,
        values: valueNode.values.map(value =>
          replaceVariables(value, variableValues, fragmentVariableValues),
        ),
      };
    }
    default:
      return valueNode;
  }
}

/**
 * Convert a runtime value to an AST literal for `replaceVariables`. Prefers the
 * type's `valueToLiteral` when present; otherwise uses a JSON-like fallback that
 * honors `.toJSON()` (so `Date` round-trips).
 */
function valueToLiteral(value: unknown, type: GraphQLInputType): ValueNode {
  if (isNonNullType(type)) {
    if (value == null) {
      return { kind: Kind.NULL };
    }
    return valueToLiteral(value, type.ofType);
  }
  if (value == null) {
    return { kind: Kind.NULL };
  }
  if (isListType(type)) {
    if (!isIterableObject(value)) {
      return valueToLiteral(value, type.ofType);
    }
    return {
      kind: Kind.LIST,
      values: Array.from(value, item => valueToLiteral(item, type.ofType)),
    };
  }
  if (isInputObjectType(type)) {
    if (!isObjectLike(value)) {
      return { kind: Kind.NULL };
    }
    const fields: Array<{
      kind: typeof Kind.OBJECT_FIELD;
      name: { kind: typeof Kind.NAME; value: string };
      value: ValueNode;
    }> = [];
    for (const field of Object.values(type.getFields())) {
      const fieldValue = value[field.name];
      if (fieldValue === undefined) {
        continue;
      }
      fields.push({
        kind: Kind.OBJECT_FIELD,
        name: { kind: Kind.NAME, value: field.name },
        value: valueToLiteral(fieldValue, field.type),
      });
    }
    return { kind: Kind.OBJECT, fields };
  }
  const leafType = assertLeafType(type) as any;
  if (typeof leafType.valueToLiteral === 'function') {
    try {
      const literal = leafType.valueToLiteral(value);
      if (literal != null) {
        return literal;
      }
    } catch {
      // fall through
    }
  }
  return defaultScalarValueToLiteral(value);
}

function defaultScalarValueToLiteral(value: unknown): ValueNode {
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
    const stringNum = String(value);
    return integerStringRegExp.test(stringNum)
      ? { kind: Kind.INT, value: stringNum }
      : { kind: Kind.FLOAT, value: stringNum };
  }
  if (typeof value === 'object') {
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      return defaultScalarValueToLiteral((value as { toJSON(): unknown }).toJSON());
    }
    if (Symbol.iterator in (value as object)) {
      return {
        kind: Kind.LIST,
        values: Array.from(value as Iterable<unknown>, defaultScalarValueToLiteral),
      };
    }
    const fields: Array<{
      kind: typeof Kind.OBJECT_FIELD;
      name: { kind: typeof Kind.NAME; value: string };
      value: ValueNode;
    }> = [];
    for (const [fieldName, fieldValue] of Object.entries(value)) {
      if (fieldValue !== undefined) {
        fields.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: fieldName },
          value: defaultScalarValueToLiteral(fieldValue),
        });
      }
    }
    return { kind: Kind.OBJECT, fields };
  }
  return { kind: Kind.NULL };
}

const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;
