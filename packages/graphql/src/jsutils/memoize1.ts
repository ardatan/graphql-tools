/**
 * Memoizes the provided one-argument function.
 */
export function memoize1<F extends (a1: any) => any>(fn: F): F {
  const memoize1cache: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any): any {
    const cachedValue = memoize1cache.get(a1);
    if (cachedValue === undefined) {
      const newValue = fn(a1);
      memoize1cache.set(a1, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}
