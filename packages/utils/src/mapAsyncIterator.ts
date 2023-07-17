/**
 * Given an AsyncIterable and a callback function, return an AsyncIterator
 * which produces values mapped via calling the callback function.
 */
export function mapAsyncIterator<T, U>(
  iterator: AsyncIterator<T>,
  callback: (value: T) => Promise<U> | U,
  rejectCallback?: any,
): AsyncIterableIterator<U> {
  let $return: any;
  let abruptClose: any;

  if (typeof iterator.return === 'function') {
    $return = iterator.return;
    abruptClose = (error: any) => {
      const rethrow = () => Promise.reject(error);
      return $return.call(iterator).then(rethrow, rethrow);
    };
  }

  function mapResult(result: any) {
    return result.done
      ? result
      : asyncMapValue(result.value, callback).then(iteratorResult, abruptClose);
  }

  let mapReject: any;
  if (rejectCallback) {
    // Capture rejectCallback to ensure it cannot be null.
    const reject = rejectCallback;
    mapReject = (error: any) => asyncMapValue(error, reject).then(iteratorResult, abruptClose);
  }

  return {
    next() {
      return iterator.next().then(mapResult, mapReject);
    },
    return() {
      return $return
        ? $return.call(iterator).then(mapResult, mapReject)
        : Promise.resolve({ value: undefined, done: true });
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

function asyncMapValue<T, U>(value: T, callback: (value: T) => Promise<U> | U): Promise<U> {
  return new Promise(resolve => resolve(callback(value)));
}

function iteratorResult<T>(value: T): IteratorResult<T> {
  return { value, done: false };
}
