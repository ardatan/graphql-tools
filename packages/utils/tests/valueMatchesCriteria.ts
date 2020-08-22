import { valueMatchesCriteria } from '../src/index';

describe('valueMatchesCriteria', () => {
  test('matches directive value object', () => {
    const dirValue = { reason: 'reason', also: 'also' };

    expect(valueMatchesCriteria(dirValue, {})).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: 'reason' })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: 'reason', also: 'also' })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: 'reason', and: 'and' })).toBe(false);
    expect(valueMatchesCriteria(dirValue, { this: 'this' })).toBe(false);
    expect(valueMatchesCriteria(dirValue, { this: 'reason' })).toBe(false);
    expect(valueMatchesCriteria(dirValue, { reason: 'this' })).toBe(false);
  });

  test('matches empty arguments', () => {
    expect(valueMatchesCriteria({}, {})).toBe(true);
  });
});
