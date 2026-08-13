import { observableToAsyncIterable } from '@graphql-tools/utils';

describe('observableToAsyncIterable', () => {
  test('finalize iterator when complete() is called on observer', () => {
    const iterator = observableToAsyncIterable({
      subscribe: observer => {
        observer.complete();
        return { unsubscribe: () => {} };
      },
    });

    return iterator.next().then(result => expect(result.done).toEqual(true));
  });

  test('unsubscribes and clears queues when done is pulled from pushQueue', async () => {
    let unsubscribed = false;
    const iterator = observableToAsyncIterable({
      subscribe: observer => {
        observer.next(1);
        observer.complete();
        return {
          unsubscribe: () => {
            unsubscribed = true;
          },
        };
      },
    });

    await expect(iterator.next()).resolves.toEqual({ value: 1, done: false });
    await expect(iterator.next()).resolves.toEqual({ done: true });
    expect(unsubscribed).toBe(true);
    // Further pulls should stay done without hanging
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
  });

  test('unsubscribes when complete() resolves a pending pull', async () => {
    let unsubscribed = false;
    let observerRef: { complete: () => void } | undefined;
    const iterator = observableToAsyncIterable({
      subscribe: observer => {
        observerRef = observer;
        return {
          unsubscribe: () => {
            unsubscribed = true;
          },
        };
      },
    });

    const pending = iterator.next();
    observerRef!.complete();
    await expect(pending).resolves.toEqual({ done: true });
    expect(unsubscribed).toBe(true);
  });
});
