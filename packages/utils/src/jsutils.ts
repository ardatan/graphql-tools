import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';

export function isIterableObject(value: unknown): value is Iterable<unknown> {
  // Match graphql-js: only treat as iterable when the iterator is callable.
  // `Symbol.iterator in value` is true for `{ [Symbol.iterator]: null }`.
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
  );
}

export function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null;
}

export function promiseReduce<T, U>(
  values: Iterable<T>,
  callbackFn: (accumulator: U, currentValue: T) => MaybePromise<U>,
  initialValue: MaybePromise<U>,
): MaybePromise<U> {
  let accumulator = initialValue;

  for (const value of values) {
    accumulator = handleMaybePromise(
      () => accumulator,
      resolved => callbackFn(resolved, value),
    );
  }

  return accumulator;
}

export function hasOwnProperty(obj: unknown, prop: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * True for keys that must never be used for object-path writes because they
 * reach the prototype chain (`__proto__`, `constructor`, `prototype`).
 */
export function isDangerousObjectKey(key: unknown): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

/**
 * True when `key` is a primitive string/number that is safe to use for
 * own-property access. Rejects non-primitives (which coerce via `ToPropertyKey`)
 * and {@link isDangerousObjectKey dangerous names}.
 */
export function isSafeObjectKey(key: unknown): key is string | number {
  if (typeof key !== 'string' && typeof key !== 'number') {
    return false;
  }
  return !isDangerousObjectKey(key);
}
