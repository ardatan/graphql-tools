import { getAbortPromise, isPromise, MaybePromise } from '@graphql-tools/utils';

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
  const jobs: PromiseLike<any>[] = [];
  for (const key in object) {
    const value = object[key];
    if (isPromise(value)) {
      jobs.push(
        value.then(resolvedValue => {
          object[key] = resolvedValue as any;
        }),
      );
    }
  }
  if (jobs.length === 0) {
    return object as ResolvedObject<TData>;
  }
  const jobsPromise = Promise.all(jobs);
  if (signal) {
    const abortSignalPromise = getAbortPromise(signal);
    return Promise.race([abortSignalPromise, jobsPromise]).then(
      () => object as ResolvedObject<TData>,
    );
  }
  return jobsPromise.then(() => object as ResolvedObject<TData>);
}
