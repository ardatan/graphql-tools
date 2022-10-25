// Taken from graphql-js
// https://github.com/graphql/graphql-js/blob/main/src/jsutils/inspect.ts

import { GraphQLError } from 'graphql';
import { isAggregateError } from './AggregateError.js';

const MAX_RECURSIVE_DEPTH = 3;

/**
 * Used to print values in error messages.
 */
export function inspect(value: unknown): string {
  return formatValue(value, []);
}

function formatValue(value: unknown, seenValues: ReadonlyArray<unknown>): string {
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'function':
      return value.name ? `[function ${value.name}]` : '[function]';
    case 'object':
      return formatObjectValue(value, seenValues);
    default:
      return String(value);
  }
}

function formatError(value: Error): string {
  if (value instanceof GraphQLError) {
    return value.toString();
  }
  return `${value.name}: ${value.message};\n ${value.stack}`;
}

function formatObjectValue(value: object | null, previouslySeenValues: ReadonlyArray<unknown>): string {
  if (value === null) {
    return 'null';
  }

  if (value instanceof Error) {
    if (isAggregateError(value)) {
      return formatError(value) + '\n' + formatArray(value.errors, previouslySeenValues);
    }
    return formatError(value);
  }

  if (previouslySeenValues.includes(value)) {
    return '[Circular]';
  }

  const seenValues = [...previouslySeenValues, value];

  if (isJSONable(value)) {
    const jsonValue = value.toJSON();

    // check for infinite recursion
    if (jsonValue !== value) {
      return typeof jsonValue === 'string' ? jsonValue : formatValue(jsonValue, seenValues);
    }
  } else if (Array.isArray(value)) {
    return formatArray(value, seenValues);
  }

  return formatObject(value, seenValues);
}

function isJSONable(value: any): value is { toJSON: () => unknown } {
  return typeof value.toJSON === 'function';
}

function formatObject(object: object, seenValues: ReadonlyArray<unknown>): string {
  const entries = Object.entries(object);
  if (entries.length === 0) {
    return '{}';
  }

  if (seenValues.length > MAX_RECURSIVE_DEPTH) {
    return '[' + getObjectTag(object) + ']';
  }

  const properties = entries.map(([key, value]) => key + ': ' + formatValue(value, seenValues));
  return '{ ' + properties.join(', ') + ' }';
}

function formatArray(array: ReadonlyArray<unknown>, seenValues: ReadonlyArray<unknown>): string {
  if (array.length === 0) {
    return '[]';
  }

  if (seenValues.length > MAX_RECURSIVE_DEPTH) {
    return '[Array]';
  }

  const len = array.length;
  const items = [];

  for (let i = 0; i < len; ++i) {
    items.push(formatValue(array[i], seenValues));
  }

  return '[' + items.join(', ') + ']';
}

function getObjectTag(object: object): string {
  const tag = Object.prototype.toString
    .call(object)
    .replace(/^\[object /, '')
    .replace(/]$/, '');

  if (tag === 'Object' && typeof object.constructor === 'function') {
    const name = object.constructor.name;
    if (typeof name === 'string' && name !== '') {
      return name;
    }
  }

  return tag;
}
