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
    return (value: unknown) =>
      util
        .inspect(value, {
          depth: MAX_RECURSIVE_DEPTH,
          colors: false,
          compact: true,
          breakLength: Infinity,
        })
        // GraphQL 17 coerced maps are null-prototype; keep messages stable.
        .replaceAll('[Object: null prototype] ', '');
  } catch {
    return undefined;
  }
}

const nodeInspect = getNodeInspect();

/**
 * Print a value for error messages.
 * Prefers Node's `util.inspect` via `process.getBuiltinModule`; otherwise a
 * small `JSON.stringify` / `String` fallback (non-Node runtimes).
 */
export function inspect(value: unknown, toJSONDepth = MAX_RECURSIVE_DEPTH): string {
  if (
    toJSONDepth > 0 &&
    value != null &&
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  ) {
    try {
      const jsonValue = (value as { toJSON: () => unknown }).toJSON();
      if (jsonValue !== value) {
        return typeof jsonValue === 'string' ? jsonValue : inspect(jsonValue, toJSONDepth - 1);
      }
    } catch {
      // fall through
    }
  }

  if (nodeInspect) {
    return nodeInspect(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'function') {
    return value.name ? `[function ${value.name}]` : '[function]';
  }
  if (value === undefined) {
    return 'undefined';
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
