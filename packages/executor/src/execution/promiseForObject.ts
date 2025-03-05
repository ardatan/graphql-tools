import { getAbortPromise, isPromise, MaybePromise } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

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
): MaybePromise<ResolvedObject<TData>> {
  const resolvedObject = Object.create(null);
  const promises: Promise<void>[] = [];
  for (const key in object) {
    const valueSet$ = handleMaybePromise(
      () => object[key],
      resolvedValue => {
        resolvedObject[key] = resolvedValue;
      },
    );
    if (isPromise(valueSet$)) {
      promises.push(valueSet$);
    }
  }
  if (!promises.length) {
    return resolvedObject;
  }
  const promiseAll = promises.length === 1 ? promises[0] : Promise.all(promises);
  if (signal) {
    const abortPromise = getAbortPromise(signal);
    return Promise.race([abortPromise, promiseAll]).then(() => resolvedObject);
  }
  return promiseAll.then(() => resolvedObject);
}
