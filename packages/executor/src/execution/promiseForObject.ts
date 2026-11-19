import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { CompactExecutionResultMap } from './compactExecutionResultMap.js';
import { WorkQueue } from './workQueue.js';

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

/**
 * Planned-path variant: settle thenables through a shared microtask WorkQueue
 * so field writes batch onto one drain (CompiledExecutor-style scheduling,
 * tools-native). Sync-only maps still return immediately.
 */
export function promiseForObjectQueued<TData>(
  object: TData,
  signal?: AbortSignal,
  signalPromise?: Promise<never>,
): MaybePromise<ResolvedObject<TData>> {
  signal?.throwIfAborted();
  const resolvedObject = Object.setPrototypeOf(new CompactExecutionResultMap(), null);
  const asyncKeys: Array<{ key: keyof TData & string; value: Promise<unknown> }> = [];

  for (const key in object) {
    const value = object[key];
    if (isPromise(value)) {
      resolvedObject[key] = undefined;
      asyncKeys.push({ key, value: value as Promise<unknown> });
    } else {
      resolvedObject[key] = value as ResolvedObject<TData>[Extract<keyof TData, string>];
    }
  }

  if (asyncKeys.length === 0) {
    return resolvedObject;
  }

  // Single thenable: no queue overhead — same shape as promiseForObject.
  if (asyncKeys.length === 1) {
    const { key, value } = asyncKeys[0];
    const settled = value.then(resolvedValue => {
      resolvedObject[key] = resolvedValue as ResolvedObject<TData>[Extract<keyof TData, string>];
      return resolvedObject;
    });
    if (signalPromise) {
      return Promise.race([signalPromise, settled]);
    }
    return settled;
  }

  const queue = new WorkQueue();
  const settled = new Promise<ResolvedObject<TData>>((resolve, reject) => {
    let remaining = asyncKeys.length;
    let rejected = false;
    for (const { key, value } of asyncKeys) {
      value.then(
        resolvedValue => {
          queue.enqueue(() => {
            if (rejected) {
              return;
            }
            resolvedObject[key] = resolvedValue as ResolvedObject<TData>[Extract<
              keyof TData,
              string
            >];
            remaining--;
            if (remaining === 0) {
              resolve(resolvedObject);
            }
          });
        },
        error => {
          queue.enqueue(() => {
            if (rejected) {
              return;
            }
            rejected = true;
            reject(error);
          });
        },
      );
    }
  });

  if (signalPromise) {
    return Promise.race([signalPromise, settled]);
  }
  return settled;
}
