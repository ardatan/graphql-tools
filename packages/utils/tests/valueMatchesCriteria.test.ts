import { valueMatchesCriteria } from '../src/index';

describe('valueMatchesCriteria', () => {
  test('matches empty values', () => {
    expect(valueMatchesCriteria(undefined, undefined)).toBe(true);
    expect(valueMatchesCriteria(undefined, null)).toBe(false);
    expect(valueMatchesCriteria(null, null)).toBe(true);
  });

  test('matches primitives', () => {
    expect(valueMatchesCriteria(1, 1)).toBe(true);
    expect(valueMatchesCriteria(1, 2)).toBe(false);
    expect(valueMatchesCriteria('a', 'a')).toBe(true);
    expect(valueMatchesCriteria('a', 'b')).toBe(false);
    expect(valueMatchesCriteria(false, false)).toBe(true);
    expect(valueMatchesCriteria(false, true)).toBe(false);
  });

  test('matches empty object values', () => {
    expect(valueMatchesCriteria({}, {})).toBe(true);
  });

  test('matches value object with varying specificity', () => {
    const dirValue = { reason: 'reason', also: 'also' };

    expect(valueMatchesCriteria(dirValue, {})).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: 'reason' })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: 'reason', also: 'also' })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: 'reason', and: 'and' })).toBe(false);
    expect(valueMatchesCriteria(dirValue, { this: 'this' })).toBe(false);
    expect(valueMatchesCriteria(dirValue, { reason: 'this' })).toBe(false);
  });

  test('matches value objects recursively', () => {
    const dirValue = { reason: 'reason', also: { a: 1, b: 2 } };

    expect(valueMatchesCriteria(dirValue, { reason: 'reason' })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { also: {} })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { also: { a: 1 } })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { also: { a: 1, b: 2 } })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { also: { a: 1, b: 0 } })).toBe(false);
    expect(valueMatchesCriteria(dirValue, { also: { c: 1 } })).toBe(false);
  });

  test('matches value arrays', () => {
    const dirValue = [23, { hello: true, world: false }];

    expect(valueMatchesCriteria(dirValue, [23, { hello: true }])).toBe(true);
    expect(valueMatchesCriteria(dirValue, [23, { world: false }])).toBe(true);
    expect(valueMatchesCriteria(dirValue, [{ hello: true }, 23])).toBe(false);
  });

  test('matches value with regex', () => {
    const dirValue = { reason: 'requires: id' };

    expect(valueMatchesCriteria(dirValue, { reason: /^requires:/ })).toBe(true);
    expect(valueMatchesCriteria(dirValue, { reason: /^required:/ })).toBe(false);
  });
});
