import { observableToAsyncIterable } from '@graphql-tools/utils';

describe('observableToAsyncIterable', () => {
  test('finalize iterator when complete() is called on observer', async () => {
    const iterator = observableToAsyncIterable({
      subscribe: observer => {
        observer.complete();
        return { unsubscribe: () => {} };
      },
    });

    const result = await iterator.next();
    expect(result.done).toEqual(true);
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

    expect(await iterator.next()).toEqual({ value: 1, done: false });
    expect(await iterator.next()).toEqual({ value: undefined, done: true });
    expect(unsubscribed).toBe(true);
    // Further pulls should stay done without hanging
    expect(await iterator.next()).toEqual({ value: undefined, done: true });
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
    expect(await pending).toEqual({ value: undefined, done: true });
    expect(unsubscribed).toBe(true);
  });

  test('unsubscribes when complete() runs synchronously during subscribe', async () => {
    let unsubscribed = false;
    const iterator = observableToAsyncIterable({
      subscribe: observer => {
        observer.complete();
        return {
          unsubscribe: () => {
            unsubscribed = true;
          },
        };
      },
    });

    expect(await iterator.next()).toEqual({ value: undefined, done: true });
    // return() after sync complete should still have unsubscribed the subscription
    await iterator.return!();
    expect(unsubscribed).toBe(true);
  });
});
