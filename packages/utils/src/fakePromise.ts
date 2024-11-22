function isPromise<T>(val: T | Promise<T>): val is Promise<T> {
  return (val as any)?.then != null;
}

export function fakeRejectPromise(error: unknown): Promise<never> {
  if (isPromise(error)) {
    return error as Promise<never>;
  }
  return {
    then() {
      return this;
    },
    catch(reject: (error: unknown) => any) {
      if (reject) {
        return fakePromise(reject(error));
      }
      return this;
    },
    finally(cb) {
      if (cb) {
        cb();
      }
      return this;
    },
    [Symbol.toStringTag]: 'Promise',
  };
}

export function fakePromise<T>(value: T): Promise<T> {
  if (isPromise(value)) {
    return value;
  }
  // Write a fake promise to avoid the promise constructor
  // being called with `new Promise` in the browser.
  return {
    then(resolve: (value: T) => any) {
      if (resolve) {
        const callbackResult = resolve(value);
        if (isPromise(callbackResult)) {
          return callbackResult;
        }
        return fakePromise(callbackResult);
      }
      return this;
    },
    catch() {
      return this;
    },
    finally(cb) {
      if (cb) {
        const callbackResult = cb();
        if (isPromise(callbackResult)) {
          return callbackResult.then(() => value);
        }
        return fakePromise(value);
      }
      return this;
    },
    [Symbol.toStringTag]: 'Promise',
  };
}
