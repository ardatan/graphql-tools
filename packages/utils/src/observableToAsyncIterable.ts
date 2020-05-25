export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

export interface Observable<T> {
  subscribe(
    observer: Observer<T>
  ): {
    unsubscribe: () => void;
  };
}

export type Callback = (value?: any) => any;

export function observableToAsyncIterable<T>(
  observable: Observable<T>
): AsyncIterator<T> & {
  [Symbol.asyncIterator]: () => AsyncIterator<T>;
} {
  const pullQueue: Array<Callback> = [];
  const pushQueue: Array<any> = [];

  let listening = true;

  const pushValue = (value: any) => {
    if (pullQueue.length !== 0) {
      pullQueue.shift()({ value, done: false });
    } else {
      pushQueue.push({ value });
    }
  };

  const pushError = (error: any) => {
    if (pullQueue.length !== 0) {
      pullQueue.shift()({ value: { errors: [error] }, done: false });
    } else {
      pushQueue.push({ value: { errors: [error] } });
    }
  };

  const pullValue = () =>
    new Promise(resolve => {
      if (pushQueue.length !== 0) {
        const element = pushQueue.shift();
        // either {value: {errors: [...]}} or {value: ...}
        resolve({
          ...element,
          done: false,
        });
      } else {
        pullQueue.push(resolve);
      }
    });

  const subscription = observable.subscribe({
    next(value: any) {
      pushValue(value);
    },
    error(err: Error) {
      pushError(err);
    },
  });

  const emptyQueue = () => {
    if (listening) {
      listening = false;
      subscription.unsubscribe();
      pullQueue.forEach(resolve => resolve({ value: undefined, done: true }));
      pullQueue.length = 0;
      pushQueue.length = 0;
    }
  };

  return {
    next() {
      return listening ? pullValue() : this.return();
    },
    return() {
      emptyQueue();
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      emptyQueue();
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
