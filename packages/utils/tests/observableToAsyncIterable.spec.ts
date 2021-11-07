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
});
