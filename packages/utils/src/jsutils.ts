import { handleMaybePromise, isPromise, MaybePromise } from '@whatwg-node/promise-helpers';

export function isIterableObject(value: unknown): value is Iterable<unknown> {
  return value != null && typeof value === 'object' && Symbol.iterator in value;
}

export function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null;
}

export { isPromise };

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

export function hasOwnProperty(obj: unknown, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
