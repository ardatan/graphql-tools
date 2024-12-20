import type { MaybePromise } from './executor.js';
import { fakePromise, fakeRejectPromise } from './fakePromise.js';
import { mapMaybePromise } from './map-maybe-promise.js';

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
    let onEndWithValueResult: any /** R in onEndWithValue */;
    onEndWithValue = value => {
      onEndWithValueResult ||= mapMaybePromise(onEnd(), () => value);
      return onEndWithValueResult;
    };
  }

  if (typeof iterator.return === 'function') {
    $return = iterator.return;
    abruptClose = (error: any) => {
      const rethrow = () => {
        throw error;
      };
      return $return.call(iterator).then(rethrow, rethrow);
    };
  }

  function mapResult(result: any) {
    if (result.done) {
      return onEndWithValue ? onEndWithValue(result) : result;
    }
    return mapMaybePromise(result.value, value =>
      mapMaybePromise(onNext(value), iteratorResult, abruptClose),
    );
  }

  let mapReject: any;
  if (onError) {
    let onErrorResult: unknown;
    // Capture rejectCallback to ensure it cannot be null.
    const reject = onError;
    mapReject = (error: any) => {
      onErrorResult ||= mapMaybePromise(error, error =>
        mapMaybePromise(reject(error), iteratorResult, abruptClose),
      );
      return onErrorResult;
    };
  }

  return {
    next() {
      return iterator.next().then(mapResult, mapReject);
    },
    return() {
      const res$ = $return
        ? $return.call(iterator).then(mapResult, mapReject)
        : fakePromise({ value: undefined, done: true });
      return onEndWithValue ? res$.then(onEndWithValue) : res$;
    },
    throw(error: any) {
      if (typeof iterator.throw === 'function') {
        return iterator.throw(error).then(mapResult, mapReject);
      }
      if (abruptClose) {
        return abruptClose(error);
      }
      return fakeRejectPromise(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

function iteratorResult<T>(value: T): IteratorResult<T> {
  return { value, done: false };
}
