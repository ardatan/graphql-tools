import { expectPromise } from '../../__testUtils__/expectPromise.js';
import { mapAsyncIterable } from '../mapAsyncIterable.js';

describe('mapAsyncIterable', () => {
  it('maps over async generator', async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const doubles = mapAsyncIterable(source(), x => x + x);

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });
    expect(await doubles.next()).toEqual({ value: 6, done: false });
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('maps over async iterable', async () => {
    const items = [1, 2, 3];

    const iterable = {
      [Symbol.asyncIterator]() {
        return this;
      },

      next(): Promise<IteratorResult<number, void>> {
        if (items.length > 0) {
          const value = items[0];
          items.shift();
          return Promise.resolve({ done: false, value });
        }

        return Promise.resolve({ done: true, value: undefined });
      },
    };

    const doubles = mapAsyncIterable(iterable, x => x + x);

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });
    expect(await doubles.next()).toEqual({ value: 6, done: false });
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('compatible with for-await-of', async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const doubles = mapAsyncIterable(source(), x => x + x);

    const result = [];
    for await (const x of doubles) {
      result.push(x);
    }
    expect(result).toEqual([2, 4, 6]);
  });

  it('maps over async values with async function', async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const doubles = mapAsyncIterable(source(), x => Promise.resolve(x + x));

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });
    expect(await doubles.next()).toEqual({ value: 6, done: false });
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('allows returning early from mapped async generator', async () => {
    async function* source() {
      try {
        yield 1;
        yield 2;
        yield 3; // Shouldn't be reached.
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        return 'The End';
      }
    }

    const doubles = mapAsyncIterable(source(), x => x + x);

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });

    // Early return
    expect(await doubles.return('')).toEqual({
      value: 'The End',
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

  it('allows returning early from mapped async iterable', async () => {
    const items = [1, 2, 3];

    const iterable = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        const value = items[0];
        items.shift();
        return Promise.resolve({
          done: items.length === 0,
          value,
        });
      },
    };

    const doubles = mapAsyncIterable(iterable, x => x + x);

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });

    // Early return
    expect(await doubles.return(0)).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('passes through early return from async values', async () => {
    async function* source() {
      try {
        yield 'a';
        yield 'b';
        yield 'c'; // Shouldn't be reached.
      } finally {
        yield 'Done';
        yield 'Last';
      }
    }

    const doubles = mapAsyncIterable(source(), x => x + x);

    expect(await doubles.next()).toEqual({ value: 'aa', done: false });
    expect(await doubles.next()).toEqual({ value: 'bb', done: false });

    // Early return
    expect(await doubles.return()).toEqual({
      value: 'DoneDone',
      done: false,
    });

    // Subsequent next calls may yield from finally block
    expect(await doubles.next()).toEqual({
      value: 'LastLast',
      done: false,
    });
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('allows throwing errors through async iterable', async () => {
    const items = [1, 2, 3];

    const iterable = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        const value = items[0];
        items.shift();
        return Promise.resolve({
          done: items.length === 0,
          value,
        });
      },
    };

    const doubles = mapAsyncIterable(iterable, x => x + x);

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });

    // Throw error
    const message = 'allows throwing errors when mapping async iterable';
    const thrown = doubles.throw(new Error(message));
    await expectPromise(thrown).toRejectWith(message);
  });

  it('passes through caught errors through async generators', async () => {
    async function* source() {
      try {
        yield 1;
        yield 2;
        yield 3; // Shouldn't be reached.
      } catch (e) {
        yield e;
      }
    }

    const doubles = mapAsyncIterable(source(), x => (x as number) + (x as number));

    expect(await doubles.next()).toEqual({ value: 2, done: false });
    expect(await doubles.next()).toEqual({ value: 4, done: false });

    // Throw error
    expect(await doubles.throw('Ouch')).toEqual({
      value: 'OuchOuch',
      done: false,
    });

    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
    expect(await doubles.next()).toEqual({
      value: undefined,
      done: true,
    });
  });

  it('does not normally map over thrown errors', async () => {
    async function* source() {
      yield 'Hello';
      throw new Error('Goodbye');
    }

    const doubles = mapAsyncIterable(source(), x => x + x);

    expect(await doubles.next()).toEqual({
      value: 'HelloHello',
      done: false,
    });

    await expectPromise(doubles.next()).toRejectWith('Goodbye');
  });

  async function testClosesSourceWithMapper<T>(mapper: (value: number) => T) {
    let didVisitFinally = false;

    async function* source() {
      try {
        yield 1;
        yield 2;
        yield 3; // Shouldn't be reached.
      } finally {
        didVisitFinally = true;
        yield 1000;
      }
    }

    const throwOver1 = mapAsyncIterable(source(), mapper);

    expect(await throwOver1.next()).toEqual({ value: 1, done: false });

    await expectPromise(throwOver1.next()).toRejectWith('Cannot count to 2');

    expect(await throwOver1.next()).toEqual({
      value: undefined,
      done: true,
    });

    expect(didVisitFinally).toBeTruthy();
  }

  it('closes source if mapper throws an error', async () => {
    await testClosesSourceWithMapper(x => {
      if (x > 1) {
        throw new Error('Cannot count to ' + x);
      }
      return x;
    });
  });

  it('closes source if mapper rejects', async () => {
    await testClosesSourceWithMapper(x =>
      x > 1 ? Promise.reject(new Error('Cannot count to ' + x)) : Promise.resolve(x)
    );
  });
});
