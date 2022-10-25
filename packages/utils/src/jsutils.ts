export type PromiseOrValue<T> = Promise<T> | T;

export function isIterableObject(value: unknown): value is Iterable<unknown> {
  return value != null && typeof value === 'object' && Symbol.iterator in value;
}

export function isObjectLike(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null;
}

export function isPromise<T>(value: unknown): value is Promise<T> {
  return isObjectLike(value) && typeof value['then'] === 'function';
}

export function promiseReduce<T, U>(
  values: Iterable<T>,
  callbackFn: (accumulator: U, currentValue: T) => PromiseOrValue<U>,
  initialValue: PromiseOrValue<U>
): PromiseOrValue<U> {
  let accumulator = initialValue;

  for (const value of values) {
    accumulator = isPromise(accumulator)
      ? accumulator.then(resolved => callbackFn(resolved, value))
      : callbackFn(accumulator, value);
  }

  return accumulator;
}

export function hasOwnProperty(obj: unknown, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
