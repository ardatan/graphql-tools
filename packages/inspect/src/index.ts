// Ponyfill taken from graphql-js
// https://github.com/graphql/graphql-js/blob/main/src/jsutils/inspect.ts
const MAX_RECURSIVE_DEPTH = 3;

type NodeUtil = {
  inspect: (value: unknown, options?: Record<string, unknown>) => string;
};

function getNodeInspect(): ((value: unknown) => string) | undefined {
  const getBuiltinModule = (
    globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }
  ).process?.getBuiltinModule;
  if (typeof getBuiltinModule !== 'function') {
    return undefined;
  }
  try {
    const util = getBuiltinModule('util') as NodeUtil | undefined;
    if (typeof util?.inspect !== 'function') {
      return undefined;
    }
    return (value: unknown) => {
      // GraphQL 17 coerced maps are null-prototype; GraphQL 16's are not.
      // Strip the Node prefix so error strings stay stable across peers.
      return util
        .inspect(value, {
          depth: MAX_RECURSIVE_DEPTH,
          colors: false,
          compact: true,
          breakLength: Infinity,
        })
        .replaceAll('[Object: null prototype] ', '');
    };
  } catch {
    return undefined;
  }
}

const nodeInspect = getNodeInspect();

/**
 * Used to print values in error messages.
 * Prefers Node's `util.inspect` via `process.getBuiltinModule` when available.
 * Still honors `toJSON()` first (e.g. GraphQL type names), matching graphql-js.
 */
export function inspect(value: unknown): string {
  if (nodeInspect) {
    if (value != null && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      const jsonValue = (value as { toJSON: () => unknown }).toJSON();
      if (jsonValue !== value) {
        return typeof jsonValue === 'string' ? jsonValue : nodeInspect(jsonValue);
      }
    }
    return nodeInspect(value);
  }
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
  if (value.name === 'GraphQLError') {
    return value.toString();
  }
  return `${value.name}: ${value.message};\n ${value.stack}`;
}

function formatObjectValue(
  value: object | null,
  previouslySeenValues: ReadonlyArray<unknown>,
): string {
  if (value === null) {
    return 'null';
  }

  if (value instanceof Error) {
    if (value.name === 'AggregateError') {
      return (
        formatError(value) +
        '\n' +
        formatArray((value as AggregateError).errors, previouslySeenValues)
      );
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
  const items: any[] = [];

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
