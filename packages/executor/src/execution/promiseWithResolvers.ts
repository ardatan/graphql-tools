import { MaybePromise } from '@graphql-tools/utils';

/**
 * Based on Promise.withResolvers proposal
 * https://github.com/tc39/proposal-promise-with-resolvers
 */
export function promiseWithResolvers<T>(): {
  promise: Promise<T>;
  resolve: (value: T | MaybePromise<T>) => void;
  reject: (reason?: any) => void;
} {
  // these are assigned synchronously within the Promise constructor
  let resolve!: (value: T | MaybePromise<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
