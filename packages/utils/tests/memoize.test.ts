import { memoize4, memoize5 } from '../src/memoize.js';

describe('memoize4', () => {
  it('returns cached values and does not throw on partial cache hits', () => {
    const fn = jest.fn((a: object, b: object, c: object, d: object) => ({ a, b, c, d }));
    const memoized = memoize4(fn);

    const a = {};
    const b = {};
    const c = {};
    const d1 = {};
    const d2 = {};

    const first = memoized(a, b, c, d1);
    const second = memoized(a, b, c, d2);
    const third = memoized(a, b, c, d1);

    expect(first).toBe(third);
    expect(second).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('memoize5', () => {
  it('returns cached values and does not throw on partial cache hits', () => {
    const fn = jest.fn((a: object, b: object, c: object, d: object, e: object) => ({
      a,
      b,
      c,
      d,
      e,
    }));
    const memoized = memoize5(fn);

    const a = {};
    const b = {};
    const c = {};
    const d = {};
    const e1 = {};
    const e2 = {};

    const first = memoized(a, b, c, d, e1);
    const second = memoized(a, b, c, d, e2);
    const third = memoized(a, b, c, d, e1);

    expect(first).toBe(third);
    expect(second).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
