import { suggestionList } from '../suggestionList.js';

function expectSuggestions(input: string, options: ReadonlyArray<string>) {
  return expect(suggestionList(input, options));
}

describe('suggestionList', () => {
  it('Returns results when input is empty', () => {
    expectSuggestions('', ['a']).toEqual(['a']);
  });

  it('Returns empty array when there are no options', () => {
    expectSuggestions('input', []).toEqual([]);
  });

  it('Returns options with small lexical distance', () => {
    expectSuggestions('greenish', ['green']).toEqual(['green']);
    expectSuggestions('green', ['greenish']).toEqual(['greenish']);
  });

  it('Rejects options with distance that exceeds threshold', () => {
    // spell-checker:disable
    expectSuggestions('aaaa', ['aaab']).toEqual(['aaab']);
    expectSuggestions('aaaa', ['aabb']).toEqual(['aabb']);
    expectSuggestions('aaaa', ['abbb']).toEqual([]);
    // spell-checker:enable

    expectSuggestions('ab', ['ca']).toEqual([]);
  });

  it('Returns options with different case', () => {
    // cSpell:ignore verylongstring
    expectSuggestions('verylongstring', ['VERYLONGSTRING']).toEqual(['VERYLONGSTRING']);

    expectSuggestions('VERYLONGSTRING', ['verylongstring']).toEqual(['verylongstring']);

    expectSuggestions('VERYLONGSTRING', ['VeryLongString']).toEqual(['VeryLongString']);
  });

  it('Returns options with transpositions', () => {
    expectSuggestions('agr', ['arg']).toEqual(['arg']);
    expectSuggestions('214365879', ['123456789']).toEqual(['123456789']);
  });

  it('Returns options sorted based on lexical distance', () => {
    expectSuggestions('abc', ['a', 'ab', 'abc']).toEqual(['abc', 'ab', 'a']);
  });

  it('Returns options with the same lexical distance sorted lexicographically', () => {
    expectSuggestions('a', ['az', 'ax', 'ay']).toEqual(['ax', 'ay', 'az']);
  });
});
