function isThenable<T>(value: Promise<T> | T): value is Promise<T> {
  return value != null && typeof (value as Promise<T>).then === 'function';
}

export function useQueue<T>(options?: { concurrency?: number }) {
  const tasks: Array<() => Promise<T> | T> = [];
  const concurrency = options?.concurrency;

  return {
    add(fn: () => Promise<T> | T) {
      tasks.push(fn);
    },
    runAll() {
      const total = tasks.length;
      if (total === 0) {
        return;
      }

      const limit = concurrency ?? total;
      let index = 0;
      let activeCount = 0;
      let settledCount = 0;
      let failed = false;
      let resolveDone: (() => void) | undefined;
      let rejectDone: ((reason?: unknown) => void) | undefined;
      let donePromise: Promise<void> | undefined;

      const ensureDonePromise = () => {
        if (!donePromise) {
          ({
            promise: donePromise,
            resolve: resolveDone,
            reject: rejectDone,
          } = Promise.withResolvers<void>());
        }
        return donePromise;
      };

      const onSettle = () => {
        settledCount++;
        if (failed) {
          return;
        }
        if (settledCount === total) {
          resolveDone?.();
          return;
        }
        pump();
      };

      const pump = () => {
        while (!failed && activeCount < limit && index < total) {
          const task = tasks[index++];
          activeCount++;

          let result: Promise<T> | T;
          try {
            result = task();
          } catch (error) {
            failed = true;
            activeCount--;
            // If callers are already awaiting the completion gate, reject it.
            // Otherwise keep the sync failure synchronous.
            if (rejectDone) {
              rejectDone(error);
              return;
            }
            throw error;
          }

          if (isThenable(result)) {
            // Only async work needs a completion gate; sync results stay sync.
            ensureDonePromise();
            result.then(
              () => {
                activeCount--;
                onSettle();
              },
              error => {
                failed = true;
                activeCount--;
                rejectDone!(error);
              },
            );
          } else {
            activeCount--;
            settledCount++;
          }
        }

        if (!failed && settledCount === total) {
          resolveDone?.();
        }
      };

      pump();

      if (failed) {
        return donePromise;
      }
      if (settledCount === total) {
        return;
      }
      return ensureDonePromise();
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
