export function memoize2of5<
  T1 extends Record<string, any>,
  T2 extends Record<string, any>,
  T3 extends any,
  T4 extends any,
  T5 extends any,
  R extends any
>(fn: (A1: T1, A2: T2, A3: T3, A4: T4, A5: T5) => R): (A1: T1, A2: T2, A3: T3, A4: T4, A5: T5) => R {
  let cache1: WeakMap<T1, WeakMap<T2, R>>;

  function memoized(a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) {
    if (!cache1) {
      cache1 = new WeakMap();
      const cache2: WeakMap<T2, R> = new WeakMap();
      cache1.set(a1, cache2);
      const newValue = fn(a1, a2, a3, a4, a5);
      cache2.set(a2, newValue);
      return newValue;
    }

    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const newValue = fn(a1, a2, a3, a4, a5);
      cache2.set(a2, newValue);
      return newValue;
    }

    const cachedValue = cache2.get(a2);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4, a5);
      cache2.set(a2, newValue);
      return newValue;
    }

    return cachedValue;
  }

  return memoized;
}
