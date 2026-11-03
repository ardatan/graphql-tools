function createLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (activeCount >= concurrency) {
      return;
    }
    const run = queue.shift();
    if (!run) {
      return;
    }
    activeCount++;
    run();
  };

  return function limit<T>(fn: () => Promise<T> | T): Promise<T> {
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    queue.push(() => {
      Promise.resolve()
        .then(fn)
        .then(
          value => {
            activeCount--;
            next();
            resolve(value);
          },
          error => {
            activeCount--;
            next();
            reject(error);
          },
        );
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
