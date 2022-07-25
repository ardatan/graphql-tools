import { genFuzzStrings } from '../genFuzzStrings.js';

function expectFuzzStrings(options: { allowedChars: ReadonlyArray<string>; maxLength: number }) {
  return expect([...genFuzzStrings(options)]);
}

describe('genFuzzStrings', () => {
  it('always provide empty string', () => {
    expectFuzzStrings({ allowedChars: [], maxLength: 0 }).toEqual(['']);
    expectFuzzStrings({ allowedChars: [], maxLength: 1 }).toEqual(['']);
    expectFuzzStrings({ allowedChars: ['a'], maxLength: 0 }).toEqual(['']);
  });

  it('generate strings with single character', () => {
    expectFuzzStrings({ allowedChars: ['a'], maxLength: 1 }).toEqual(['', 'a']);

    expectFuzzStrings({
      allowedChars: ['a', 'b', 'c'],
      maxLength: 1,
    }).toEqual(['', 'a', 'b', 'c']);
  });

  it('generate strings with multiple character', () => {
    expectFuzzStrings({ allowedChars: ['a'], maxLength: 2 }).toEqual(['', 'a', 'aa']);

    expectFuzzStrings({
      allowedChars: ['a', 'b', 'c'],
      maxLength: 2,
    }).toEqual(['', 'a', 'b', 'c', 'aa', 'ab', 'ac', 'ba', 'bb', 'bc', 'ca', 'cb', 'cc']);
  });

  it('generate strings longer than possible number of characters', () => {
    expectFuzzStrings({
      allowedChars: ['a', 'b'],
      maxLength: 3,
    }).toEqual(['', 'a', 'b', 'aa', 'ab', 'ba', 'bb', 'aaa', 'aab', 'aba', 'abb', 'baa', 'bab', 'bba', 'bbb']);
  });
});
