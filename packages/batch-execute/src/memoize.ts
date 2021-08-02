const memoize2of4cache: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
export function memoize2of4<F extends (a1: any, a2: any, a3: any, a4: any) => any>(fn: F): F {
  return function memoized(a1: any, a2: any, a3: any, a4: any): any {
    let cache2 = memoize2of4cache.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      memoize2of4cache.set(a1, cache2);
      const newValue = fn(a1, a2, a3, a4);
      cache2.set(a2, newValue);
      return newValue;
    }

    const cachedValue = cache2.get(a2);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4);
      cache2.set(a2, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}
