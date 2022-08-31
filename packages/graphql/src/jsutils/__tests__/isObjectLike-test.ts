import { identityFunc } from '../identityFunc.js';
import { isObjectLike } from '../isObjectLike.js';

describe('isObjectLike', () => {
  it('should return `true` for objects', () => {
    expect(isObjectLike({})).toEqual(true);
    expect(isObjectLike(Object.create(null))).toEqual(true);
    expect(isObjectLike(/a/)).toEqual(true);
    expect(isObjectLike([])).toEqual(true);
  });

  it('should return `false` for non-objects', () => {
    expect(isObjectLike(undefined)).toEqual(false);
    expect(isObjectLike(null)).toEqual(false);
    expect(isObjectLike(true)).toEqual(false);
    expect(isObjectLike('')).toEqual(false);
    expect(isObjectLike(identityFunc)).toEqual(false);
  });
});
