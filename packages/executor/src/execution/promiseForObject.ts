import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { CompactExecutionResultMap } from './compactExecutionResultMap.js';
import { WorkQueue } from './workQueue.js';

type ResolvedObject<TData> = {
  [TKey in keyof TData]: TData[TKey] extends Promise<infer TValue> ? TValue : TData[TKey];
};

/**
 * Shared settler: transform `Record<string, Promise<T> | T>` into
 * `Promise<Record<string, T>>` / sync map (bluebird `Promise.props` shape).
 *
 * Uses V8-friendly `Promise.all` for the join. Optional `queue` runs field
 * *execution* jobs with sync `flush` before settling — it must not wrap each
 * then-write in another `queueMicrotask` (that regresses async-object).
 */
function settleObject<TData>(
  object: TData,
  signal?: AbortSignal,
  signalPromise?: Promise<never>,
  queue?: WorkQueue,
): MaybePromise<ResolvedObject<TData>> {
  signal?.throwIfAborted();

  if (queue != null) {
    // Drain any pending planned field jobs before reading thenables.
    queue.flush();
  }

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
  return settleObject(object, signal, signalPromise);
}

/**
 * Planned-path settler: same `Promise.all` join as `promiseForObject`, with an
 * optional WorkQueue flushed synchronously first (field jobs), never an extra
 * microtask hop per write.
 */
export function promiseForObjectQueued<TData>(
  object: TData,
  signal?: AbortSignal,
  signalPromise?: Promise<never>,
  queue?: WorkQueue,
): MaybePromise<ResolvedObject<TData>> {
  return settleObject(object, signal, signalPromise, queue);
}
