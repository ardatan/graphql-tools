import { flattenAsyncIterable } from '../flattenAsyncIterable.js';

describe('flattenAsyncIterable', () => {
  it('flatten nested async generators', async () => {
    async function* source() {
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(1.1);
          yield await Promise.resolve(1.2);
        })(),
      );
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(2.1);
          yield await Promise.resolve(2.2);
        })(),
      );
    }

    const doubles = flattenAsyncIterable(source());

    const result: any[] = [];
    for await (const x of doubles) {
      result.push(x);
    }
    expect(result).toEqual([1.1, 1.2, 2.1, 2.2]);
  });

  it('allows returning early from a nested async generator', async () => {
    async function* source() {
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(1.1);
          yield await Promise.resolve(1.2);
        })(),
      );
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(2.1); /* c8 ignore start */
          // Not reachable, early return
          yield await Promise.resolve(2.2);
        })(),
      );
      // Not reachable, early return
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(3.1);
          yield await Promise.resolve(3.2);
        })(),
      );
    }
    /* c8 ignore stop */

    const doubles = flattenAsyncIterable(source());

    expect(await doubles.next()).toEqual({ value: 1.1, done: false });
    expect(await doubles.next()).toEqual({ value: 1.2, done: false });
    expect(await doubles.next()).toEqual({ value: 2.1, done: false });

    // Early return
    expect(await doubles.return()).toEqual({
      value: undefined,
      done: true,
    });

    // Subsequent next calls
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('allows throwing errors from a nested async generator', async () => {
    async function* source() {
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(1.1);
          yield await Promise.resolve(1.2);
        })(),
      );
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(2.1); /* c8 ignore start */
          // Not reachable, early return
          yield await Promise.resolve(2.2);
        })(),
      );
      // Not reachable, early return
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(3.1);
          yield await Promise.resolve(3.2);
        })(),
      );
    }
    /* c8 ignore stop */

    const doubles = flattenAsyncIterable(source());

    expect(await doubles.next()).toEqual({ value: 1.1, done: false });
    expect(await doubles.next()).toEqual({ value: 1.2, done: false });
    expect(await doubles.next()).toEqual({ value: 2.1, done: false });

    // Throw error
    let caughtError;
    try {
      await doubles.throw('ouch'); /* c8 ignore start */
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toEqual('ouch');
  });
  it('completely yields sub-iterables even when next() called in parallel', async () => {
    async function* source() {
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(1.1);
          yield await Promise.resolve(1.2);
        })(),
      );
      yield await Promise.resolve(
        (async function* nested(): AsyncGenerator<number, void, void> {
          yield await Promise.resolve(2.1);
          yield await Promise.resolve(2.2);
        })(),
      );
    }

    const result = flattenAsyncIterable(source());

    const promise1 = result.next();
    const promise2 = result.next();
    expect(await promise1).toEqual({ value: 1.1, done: false });
    expect(await promise2).toEqual({ value: 1.2, done: false });
    expect(await result.next()).toEqual({ value: 2.1, done: false });
    expect(await result.next()).toEqual({ value: 2.2, done: false });
    expect(await result.next()).toEqual({
      value: undefined,
      done: true,
    });
  });
});
