export function memoize3and1<
  T1 extends Record<string, any>,
  T2 extends Record<string, any>,
  T3 extends Record<string, any>,
  T4 extends string,
  R extends any
>(fn: (A1: T1, A2: T2, A3: T3, A4: T4) => R): (A1: T1, A2: T2, A3: T3, A4: T4) => R {
  let cache1: WeakMap<T1, WeakMap<T2, WeakMap<T3, Record<string, R>>>>;

  function memoized(a1: T1, a2: T2, a3: T3, a4: T4) {
    if (!cache1) {
      cache1 = new WeakMap();
      const cache2: WeakMap<T2, WeakMap<T3, Record<T4, R>>> = new WeakMap();
      cache1.set(a1, cache2);
      const cache3: WeakMap<T3, Record<T4, R>> = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = Object.create(null);
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4[a4] = newValue;
      return newValue;
    }

    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const cache3: WeakMap<T3, Record<T4, R>> = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = Object.create(null);
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4[a4] = newValue;
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = Object.create(null);
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4[a4] = newValue;
      return newValue;
    }

    let cache4 = cache3.get(a3);
    if (!cache4) {
      cache4 = Object.create(null);
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4[a4] = newValue;
      return newValue;
    }

    const cachedValue = cache4[a4];
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4);
      cache4[a4] = newValue;
      return newValue;
    }

    return cachedValue;
  }

  return memoized;
}

export function memoize4<
  T1 extends Record<string, any>,
  T2 extends Record<string, any>,
  T3 extends Record<string, any>,
  T4 extends Record<string, any>,
  R extends any
>(fn: (A1: T1, A2: T2, A3: T3, A4: T4) => R): (A1: T1, A2: T2, A3: T3, A4: T4) => R {
  let cache1: WeakMap<T1, WeakMap<T2, WeakMap<T3, WeakMap<T4, R>>>>;

  function memoized(a1: T1, a2: T2, a3: T3, a4: T4) {
    if (!cache1) {
      cache1 = new WeakMap();
      const cache2: WeakMap<T2, WeakMap<T3, WeakMap<T4, R>>> = new WeakMap();
      cache1.set(a1, cache2);
      const cache3: WeakMap<T3, WeakMap<T4, R>> = new WeakMap();
      cache2.set(a2, cache3);
      const cache4: WeakMap<T4, R> = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const cache3: WeakMap<T3, WeakMap<T4, R>> = new WeakMap();
      cache2.set(a2, cache3);
      const cache4: WeakMap<T4, R> = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4: WeakMap<T4, R> = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    let cache4 = cache3.get(a3);
    if (!cache4) {
      cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    const cachedValue = cache4.get(a4);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    return cachedValue;
  }

  return memoized;
}
