function isThenable<T>(value: Promise<T> | T): value is Promise<T> {
  return value != null && typeof (value as Promise<T>).then === 'function';
}

function createLimit(concurrency: number) {
  let activeCount = 0;
  const pending: Array<() => void> = [];

  // Drain with a loop so sync tasks do not recurse through next() and blow the stack.
  const next = () => {
    while (activeCount < concurrency && pending.length > 0) {
      const run = pending.shift()!;
      activeCount++;
      run();
    }
  };

  return function limit<T>(fn: () => Promise<T> | T): Promise<T> | T {
    // Preserve sync results when a slot is free and nothing is waiting (FIFO).
    if (activeCount < concurrency && pending.length === 0) {
      activeCount++;
      try {
        const result = fn();
        if (isThenable(result)) {
          return result.then(
            value => {
              activeCount--;
              next();
              return value;
            },
            error => {
              activeCount--;
              next();
              throw error;
            },
          );
        }
        activeCount--;
        next();
        return result;
      } catch (error) {
        activeCount--;
        next();
        throw error;
      }
    }

    const { promise, resolve, reject } = Promise.withResolvers<T>();
    pending.push(() => {
      let result: Promise<T> | T;
      try {
        result = fn();
      } catch (error) {
        activeCount--;
        reject(error);
        next();
        return;
      }

      if (isThenable(result)) {
        result.then(
          value => {
            activeCount--;
            resolve(value);
            next();
          },
          error => {
            activeCount--;
            reject(error);
            next();
          },
        );
        return;
      }

      activeCount--;
      resolve(result);
      next();
    });
    return promise;
  };
}

export function useQueue<T>(options?: { concurrency?: number }) {
  const tasks: Array<() => Promise<T> | T> = [];
  const limit = options?.concurrency
    ? createLimit(options.concurrency)
    : <TResult>(fn: () => Promise<TResult> | TResult) => fn();

  return {
    add(fn: () => Promise<T> | T) {
      tasks.push(fn);
    },
    runAll() {
      const promises: Promise<T>[] = [];
      for (const task of tasks) {
        let result: Promise<T> | T;
        try {
          result = limit(task);
        } catch (error) {
          return Promise.reject(error);
        }
        if (isThenable(result)) {
          promises.push(result);
        }
      }
      if (promises.length === 0) {
        return;
      }
      if (promises.length === 1) {
        return promises[0];
      }
      return Promise.all(promises);
    },
  };
}

export function useSyncQueue<T>() {
  const queue: Array<() => T> = [];

  return {
    add(fn: () => T) {
      queue.push(fn);
    },
    runAll() {
      for (const fn of queue) {
        fn();
      }
    },
  };
}
