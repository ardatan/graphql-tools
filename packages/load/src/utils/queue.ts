function createLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  // Drain with a loop so sync tasks do not recurse through next() and blow the stack.
  const next = () => {
    while (activeCount < concurrency && queue.length > 0) {
      const run = queue.shift()!;
      activeCount++;
      run();
    }
  };

  return function limit<T>(fn: () => Promise<T> | T): Promise<T> {
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    queue.push(() => {
      let result: Promise<T> | T;
      try {
        result = fn();
      } catch (error) {
        activeCount--;
        reject(error);
        return;
      }

      if (result != null && typeof (result as Promise<T>).then === 'function') {
        (result as Promise<T>).then(
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
      resolve(result as T);
      // Sync completion: the while-loop in next() continues after run() returns.
    });
    next();
    return promise;
  };
}

export function useQueue<T>(options?: { concurrency?: number }) {
  const queue: Array<() => Promise<T>> = [];
  const limit = options?.concurrency
    ? createLimit(options.concurrency)
    : async (fn: () => Promise<T>) => fn();

  return {
    add(fn: () => Promise<T>) {
      queue.push(() => limit(fn));
    },
    runAll() {
      return Promise.all(queue.map(fn => fn()));
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
