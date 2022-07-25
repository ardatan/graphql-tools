import { identityFunc } from '../identityFunc.js';
import { isIterableObject } from '../isIterableObject.js';

describe('isIterableObject', () => {
  it('should return `true` for collections', () => {
    expect(isIterableObject([])).toEqual(true);
    expect(isIterableObject(new Int8Array(1))).toEqual(true);

    // eslint-disable-next-line no-new-wrappers
    expect(isIterableObject(new String('ABC'))).toEqual(true);

    function getArguments() {
      return arguments;
    }
    expect(isIterableObject(getArguments())).toEqual(true);

    const iterable = { [Symbol.iterator]: identityFunc };
    expect(isIterableObject(iterable)).toEqual(true);

    function* generatorFunc() {
      /* do nothing */
    }
    expect(isIterableObject(generatorFunc())).toEqual(true);

    // But generator function itself is not iterable
    expect(isIterableObject(generatorFunc)).toEqual(false);
  });

  it('should return `false` for non-collections', () => {
    expect(isIterableObject(null)).toEqual(false);
    expect(isIterableObject(undefined)).toEqual(false);

    expect(isIterableObject('ABC')).toEqual(false);
    expect(isIterableObject('0')).toEqual(false);
    expect(isIterableObject('')).toEqual(false);

    expect(isIterableObject(1)).toEqual(false);
    expect(isIterableObject(0)).toEqual(false);
    expect(isIterableObject(NaN)).toEqual(false);
    // eslint-disable-next-line no-new-wrappers
    expect(isIterableObject(new Number(123))).toEqual(false);

    expect(isIterableObject(true)).toEqual(false);
    expect(isIterableObject(false)).toEqual(false);
    // eslint-disable-next-line no-new-wrappers
    expect(isIterableObject(new Boolean(true))).toEqual(false);

    expect(isIterableObject({})).toEqual(false);
    expect(isIterableObject({ iterable: true })).toEqual(false);

    const iteratorWithoutSymbol = { next: identityFunc };
    expect(isIterableObject(iteratorWithoutSymbol)).toEqual(false);

    const invalidIterable = {
      [Symbol.iterator]: { next: identityFunc },
    };
    expect(isIterableObject(invalidIterable)).toEqual(false);

    const arrayLike: { [key: string]: unknown } = {};
    arrayLike[0] = 'Alpha';
    arrayLike[1] = 'Bravo';
    arrayLike[2] = 'Charlie';
    arrayLike.length = 3;

    expect(isIterableObject(arrayLike)).toEqual(false);
  });
});
