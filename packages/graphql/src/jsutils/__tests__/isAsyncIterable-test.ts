import { identityFunc } from '../identityFunc.js';
import { isAsyncIterable } from '../isAsyncIterable.js';

describe('isAsyncIterable', () => {
  it('should return `true` for AsyncIterable', () => {
    const asyncIterable = { [Symbol.asyncIterator]: identityFunc };
    expect(isAsyncIterable(asyncIterable)).toEqual(true);

    async function* asyncGeneratorFunc() {
      /* do nothing */
    }

    expect(isAsyncIterable(asyncGeneratorFunc())).toEqual(true);

    // But async generator function itself is not iterable
    expect(isAsyncIterable(asyncGeneratorFunc)).toEqual(false);
  });

  it('should return `false` for all other values', () => {
    expect(isAsyncIterable(null)).toEqual(false);
    expect(isAsyncIterable(undefined)).toEqual(false);

    expect(isAsyncIterable('ABC')).toEqual(false);
    expect(isAsyncIterable('0')).toEqual(false);
    expect(isAsyncIterable('')).toEqual(false);

    expect(isAsyncIterable([])).toEqual(false);
    expect(isAsyncIterable(new Int8Array(1))).toEqual(false);

    expect(isAsyncIterable({})).toEqual(false);
    expect(isAsyncIterable({ iterable: true })).toEqual(false);

    const asyncIteratorWithoutSymbol = { next: identityFunc };
    expect(isAsyncIterable(asyncIteratorWithoutSymbol)).toEqual(false);

    const nonAsyncIterable = { [Symbol.iterator]: identityFunc };
    expect(isAsyncIterable(nonAsyncIterable)).toEqual(false);

    function* generatorFunc() {
      /* do nothing */
    }
    expect(isAsyncIterable(generatorFunc())).toEqual(false);

    const invalidAsyncIterable = {
      [Symbol.asyncIterator]: { next: identityFunc },
    };
    expect(isAsyncIterable(invalidAsyncIterable)).toEqual(false);
  });
});
