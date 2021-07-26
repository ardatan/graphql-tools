export function memoize1<F extends (a1: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any): any {
    const cachedValue = cache1.get(a1);
    if (cachedValue === undefined) {
      const newValue = fn(a1);
      cache1.set(a1, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}

export function memoize2<F extends (a1: any, a2: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any): any {
    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const newValue = fn(a1, a2);
      cache2.set(a2, newValue);
      return newValue;
    }

    const cachedValue = cache2.get(a2);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2);
      cache2.set(a2, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}

export function memoize3<F extends (a1: any, a2: any, a3: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any, a3: any) {
    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const newValue = fn(a1, a2, a3);
      cache3.set(a3, newValue);
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const newValue = fn(a1, a2, a3);
      cache3.set(a3, newValue);
      return newValue;
    }

    const cachedValue = cache3.get(a3);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3);
      cache3.set(a3, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}

export function memoize4<F extends (a1: any, a2: any, a3: any, a4: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any, a3: any, a4: any) {
    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4);
      cache4.set(a4, newValue);
      return newValue;
    }

    const cache4 = cache3.get(a3);
    if (!cache4) {
      const cache4 = new WeakMap();
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
  } as F;
}

export function memoize5<F extends (a1: any, a2: any, a3: any, a4: any, a5: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any, a3: any, a4: any, a5: any) {
    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5);
      cache5.set(a5, newValue);
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5);
      cache5.set(a5, newValue);
      return newValue;
    }

    let cache4 = cache3.get(a3);
    if (!cache4) {
      cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5);
      cache5.set(a5, newValue);
      return newValue;
    }

    let cache5 = cache4.get(a4);
    if (!cache5) {
      cache5 = new WeakMap();
      cache4.set(a4, cache5);
      const newValue = fn(a1, a2, a3, a4, a5);
      cache5.set(a5, newValue);
      return newValue;
    }

    const cachedValue = cache5.get(a5);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4, a5);
      cache5.set(a5, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}

export function memoize1of2<F extends (a1: any, a2: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any): any {
    const cachedValue = cache1.get(a1);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2);
      cache1.set(a1, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}

export function memoize2of4<F extends (a1: any, a2: any, a3: any, a4: any) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any, a3: any, a4: any): any {
    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
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

export function memoize4ofMany<F extends (a1: any, a2: any, a3: any, a4: any, ...args: Array<any>) => any>(fn: F): F {
  const cache1: WeakMap<Record<string, any>, WeakMap<Record<string, any>, any>> = new WeakMap();
  return function memoized(a1: any, a2: any, a3: any, a4: any, ...args: Array<any>) {
    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4, ...args);
      cache4.set(a4, newValue);
      return newValue;
    }

    let cache3 = cache2.get(a2);
    if (!cache3) {
      cache3 = new WeakMap();
      cache2.set(a2, cache3);
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4, ...args);
      cache4.set(a4, newValue);
      return newValue;
    }

    const cache4 = cache3.get(a3);
    if (!cache4) {
      const cache4 = new WeakMap();
      cache3.set(a3, cache4);
      const newValue = fn(a1, a2, a3, a4, ...args);
      cache4.set(a4, newValue);
      return newValue;
    }

    const cachedValue = cache4.get(a4);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2, a3, a4, ...args);
      cache4.set(a4, newValue);
      return newValue;
    }

    return cachedValue;
  } as F;
}
