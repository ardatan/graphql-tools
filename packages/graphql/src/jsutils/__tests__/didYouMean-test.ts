import { didYouMean } from '../didYouMean.js';

describe('didYouMean', () => {
  it('Does accept an empty list', () => {
    expect(didYouMean([])).toEqual('');
  });

  it('Handles single suggestion', () => {
    expect(didYouMean(['A'])).toEqual(' Did you mean "A"?');
  });

  it('Handles two suggestions', () => {
    expect(didYouMean(['A', 'B'])).toEqual(' Did you mean "A" or "B"?');
  });

  it('Handles multiple suggestions', () => {
    expect(didYouMean(['A', 'B', 'C'])).toEqual(' Did you mean "A", "B", or "C"?');
  });

  it('Limits to five suggestions', () => {
    expect(didYouMean(['A', 'B', 'C', 'D', 'E', 'F'])).toEqual(' Did you mean "A", "B", "C", "D", or "E"?');
  });

  it('Adds sub-message', () => {
    expect(didYouMean('the letter', ['A'])).toEqual(' Did you mean the letter "A"?');
  });
});
