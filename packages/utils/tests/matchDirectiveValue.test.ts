import { matchDirectiveValue } from '../src/index';

describe('matchDirectiveValue', () => {
  test('matches directive value object', () => {
    const dirValue = { reason: 'reason', also: 'also' };

    expect(matchDirectiveValue(dirValue, { reason: 'reason' })).toBe(true);
    expect(matchDirectiveValue(dirValue, { reason: 'reason', also: 'also' })).toBe(true);
    expect(matchDirectiveValue(dirValue, { reason: 'reason', and: 'and' })).toBe(false);
    expect(matchDirectiveValue(dirValue, { this: 'this' })).toBe(false);
    expect(matchDirectiveValue(dirValue, { this: 'reason' })).toBe(false);
    expect(matchDirectiveValue(dirValue, { reason: 'this' })).toBe(false);
  });

  test('matches directive value array', () => {
    const dirValue = [{ reason: 'reason', also: 'also' }, { and: 'and' }];

    expect(matchDirectiveValue(dirValue, { reason: 'reason' })).toBe(true);
    expect(matchDirectiveValue(dirValue, { and: 'and' })).toBe(true);
    expect(matchDirectiveValue(dirValue, { reason: 'reason', also: 'also' })).toBe(true);
    expect(matchDirectiveValue(dirValue, { reason: 'reason', and: 'and' })).toBe(false);
    expect(matchDirectiveValue(dirValue, { this: 'this' })).toBe(false);
    expect(matchDirectiveValue(dirValue, { this: 'reason' })).toBe(false);
    expect(matchDirectiveValue(dirValue, { reason: 'this' })).toBe(false);
  });
});
