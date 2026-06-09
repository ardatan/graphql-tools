import { isPromise } from '@graphql-tools/utils';

export class AsyncWorkTracker {
  private pendingAsyncWork = new Set<Promise<void>>();

  add(promiseLike: PromiseLike<unknown>): void {
    const pendingAsyncWork = this.pendingAsyncWork;
    const promiseToSettle = Promise.resolve(promiseLike).then(
      () => {
        pendingAsyncWork.delete(promiseToSettle);
      },
      () => {
        pendingAsyncWork.delete(promiseToSettle);
      },
    );
    pendingAsyncWork.add(promiseToSettle);
  }

  addValues(values: ReadonlyArray<unknown>): void {
    for (const value of values) {
      if (isPromise(value)) {
        this.add(value);
      }
    }
  }

  promiseAllTrackOnReject<T>(values: ReadonlyArray<PromiseLike<T> | T>): Promise<Array<T>> {
    const promise = Promise.all(values);
    promise.then(undefined, () => {
      this.addValues(values);
    });
    return promise;
  }
}
