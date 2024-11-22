import { MaybePromise } from './executor.js';
import { mapMaybePromise } from './map-maybe-promise.js';

export function isIterableObject(value: unknown): value is Iterable<unknown> {
  return value != null && typeof value === 'object' && Symbol.iterator in value;
}

export function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null;
}

export function isPromise<T>(value: any): value is PromiseLike<T> {
  return value?.then != null;
}

export function promiseReduce<T, U>(
  values: Iterable<T>,
  callbackFn: (accumulator: U, currentValue: T) => MaybePromise<U>,
  initialValue: MaybePromise<U>,
): MaybePromise<U> {
  let accumulator = initialValue;

  for (const value of values) {
    accumulator = mapMaybePromise(accumulator, resolved => callbackFn(resolved, value));
  }

  return accumulator;
}

export function hasOwnProperty(obj: unknown, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
