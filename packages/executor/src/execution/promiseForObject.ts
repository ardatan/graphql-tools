import { isPromise } from '@graphql-tools/utils';

type ResolvedObject<TData> = {
  [TKey in keyof TData]: TData[TKey] extends Promise<infer TValue> ? TValue : TData[TKey];
};

/**
 * This function transforms a JS object `Record<string, Promise<T>>` into
 * a `Promise<Record<string, T>>`
 *
 * This is akin to bluebird's `Promise.props`, but implemented only using
 * `Promise.all` so it will work with any implementation of ES6 promises.
 */
export function promiseForObject<TData>(
  object: TData,
  signal?: AbortSignal,
  signalPromise?: Promise<never>,
): Promise<ResolvedObject<TData>> {
  signal?.throwIfAborted();
  const resolvedObject = Object.create(null);
  const promises: Promise<void>[] = [];
  for (const key in object) {
    const value = object[key];
    if (isPromise(value)) {
      promises.push(
        value.then(value => {
          signal?.throwIfAborted();
          resolvedObject[key] = value;
        }),
      );
    } else {
      resolvedObject[key] = value;
    }
  }
  const promiseAll = Promise.all(promises);
  if (signalPromise) {
    return Promise.race([signalPromise, promiseAll]).then(() => resolvedObject);
  }
  return promiseAll.then(() => resolvedObject);
}
