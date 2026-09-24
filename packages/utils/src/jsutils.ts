import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';

export function isIterableObject(value: unknown): value is Iterable<unknown> {
  return value != null && typeof value === 'object' && Symbol.iterator in value;
}

export function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null;
}

export { isPromise };

export function mapMaybePromise<TInput, TOutput>(
  input: MaybePromise<TInput>,
  onSuccess: (value: TInput) => MaybePromise<TOutput>,
  onError?: (err: any) => MaybePromise<TOutput>,
): MaybePromise<TOutput> {
  return handleMaybePromise(() => input, onSuccess, onError);
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
