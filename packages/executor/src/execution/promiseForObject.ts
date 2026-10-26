import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { CompactExecutionResultMap } from './compactExecutionResultMap.js';

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
): MaybePromise<ResolvedObject<TData>> {
  signal?.throwIfAborted();
  const resolvedObject = Object.setPrototypeOf(new CompactExecutionResultMap(), null);
  const promises: Promise<void>[] = [];
  for (const key in object) {
    const valueSet$ = handleMaybePromise(
      () => object[key],
      resolvedValue => {
        resolvedObject[key] = resolvedValue;
      },
    );
    if (isPromise(valueSet$)) {
      // Reserve the key in input order before its value resolves.
      // Sync values are already written by the callback above.
      resolvedObject[key] = undefined;
      promises.push(valueSet$);
    }
  }
  if (!promises.length) {
    return resolvedObject;
  }
  const promiseAll = promises.length === 1 ? promises[0] : Promise.all(promises);
  if (signalPromise) {
    return Promise.race([signalPromise, promiseAll]).then(() => resolvedObject);
  }
  return promiseAll.then(() => resolvedObject);
}
