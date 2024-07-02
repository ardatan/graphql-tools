// TODO: Remove this after Node 22

export type Deferred<T = unknown> = PromiseWithResolvers<T>;

export function createDeferred<T>(): Deferred<T> {
  if (Promise.withResolvers) {
    return Promise.withResolvers();
  }
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve: resolve!, reject: reject! };
}
