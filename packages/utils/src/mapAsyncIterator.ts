import type { MaybePromise } from './executor.js';
import { isPromise } from './jsutils.js';

/**
 * Given an AsyncIterable and a callback function, return an AsyncIterator
 * which produces values mapped via calling the callback function.
 */
export function mapAsyncIterator<T, U>(
  iterator: AsyncIterable<T> | AsyncIterator<T>,
  onNext: (value: T) => MaybePromise<U>,
  onError?: any,
  onEnd?: () => MaybePromise<void>,
): AsyncIterableIterator<U> {
  if (Symbol.asyncIterator in iterator) {
    iterator = iterator[Symbol.asyncIterator]();
  }
  let $return: () => Promise<IteratorResult<T>>;
  let abruptClose: (error: any) => Promise<never>;
  let onEndWithValue: <R>(value: R) => MaybePromise<R>;

  if (onEnd) {
    onEndWithValue = value => {
      const onEnd$ = onEnd();
      return isPromise(onEnd$) ? onEnd$.then(() => value) : value;
    };
  }

  if (typeof iterator.return === 'function') {
    $return = iterator.return;
    abruptClose = (error: any) => {
      const rethrow = () => Promise.reject(error);
      return $return.call(iterator).then(rethrow, rethrow);
    };
  }

  function mapResult(result: any) {
    if (result.done) {
      return onEndWithValue ? onEndWithValue(result) : result;
    }
    return asyncMapValue(result.value, onNext).then(iteratorResult, abruptClose);
  }

  let mapReject: any;
  if (onError) {
    // Capture rejectCallback to ensure it cannot be null.
    const reject = onError;
    mapReject = (error: any) => asyncMapValue(error, reject).then(iteratorResult, abruptClose);
  }

  return {
    next() {
      return iterator.next().then(mapResult, mapReject);
    },
    return() {
      const res$ = $return
        ? $return.call(iterator).then(mapResult, mapReject)
        : Promise.resolve({ value: undefined, done: true });
      return onEndWithValue ? res$.then(onEndWithValue) : res$;
    },
    throw(error: any) {
      if (typeof iterator.throw === 'function') {
        return iterator.throw(error).then(mapResult, mapReject);
      }
      return Promise.reject(error).catch(abruptClose);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

function asyncMapValue<T, U>(value: T, callback: (value: T) => PromiseLike<U> | U): Promise<U> {
  return new Promise(resolve => resolve(callback(value)));
}

function iteratorResult<T>(value: T): IteratorResult<T> {
  return { value, done: false };
}
