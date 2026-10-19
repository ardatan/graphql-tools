import { memoize4, memoize5 } from '../src/memoize.js';

describe('memoize4', () => {
  it('reuses values across fourth-argument misses', () => {
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

  it('initializes and reuses the third-level cache map', () => {
    const fn = jest.fn((a: object, b: object, c: object, d: object) => ({ a, b, c, d }));
    const memoized = memoize4(fn);

    const a = {};
    const b = {};
    const c1 = {};
    const c2 = {};
    const d1 = {};
    const d2 = {};

    // Establish cache2 + cache3 via the first call.
    memoized(a, b, c1, d1);
    // Enter the `if (!cache4)` branch for a new third argument.
    const first = memoized(a, b, c2, d1);
    const second = memoized(a, b, c2, d2);
    const third = memoized(a, b, c2, d1);

    expect(first).toBe(third);
    expect(second).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('memoize5', () => {
  it('reuses values across fifth-argument misses', () => {
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

  it('initializes and reuses the third-level cache map', () => {
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
    const c1 = {};
    const c2 = {};
    const d = {};
    const e1 = {};
    const e2 = {};

    memoized(a, b, c1, d, e1);
    const first = memoized(a, b, c2, d, e1);
    const second = memoized(a, b, c2, d, e2);
    const third = memoized(a, b, c2, d, e1);

    expect(first).toBe(third);
    expect(second).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
