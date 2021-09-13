export function memoize1(fn) {
    var memoize1cache = new WeakMap();
    return function memoized(a1) {
        var cachedValue = memoize1cache.get(a1);
        if (cachedValue === undefined) {
            var newValue = fn(a1);
            memoize1cache.set(a1, newValue);
            return newValue;
        }
        return cachedValue;
    };
}
export function memoize2(fn) {
    var memoize2cache = new WeakMap();
    return function memoized(a1, a2) {
        var cache2 = memoize2cache.get(a1);
        if (!cache2) {
            cache2 = new WeakMap();
            memoize2cache.set(a1, cache2);
            var newValue = fn(a1, a2);
            cache2.set(a2, newValue);
            return newValue;
        }
        var cachedValue = cache2.get(a2);
        if (cachedValue === undefined) {
            var newValue = fn(a1, a2);
            cache2.set(a2, newValue);
            return newValue;
        }
        return cachedValue;
    };
}
export function memoize3(fn) {
    var memoize3Cache = new WeakMap();
    return function memoized(a1, a2, a3) {
        var cache2 = memoize3Cache.get(a1);
        if (!cache2) {
            cache2 = new WeakMap();
            memoize3Cache.set(a1, cache2);
            var cache3_1 = new WeakMap();
            cache2.set(a2, cache3_1);
            var newValue = fn(a1, a2, a3);
            cache3_1.set(a3, newValue);
            return newValue;
        }
        var cache3 = cache2.get(a2);
        if (!cache3) {
            cache3 = new WeakMap();
            cache2.set(a2, cache3);
            var newValue = fn(a1, a2, a3);
            cache3.set(a3, newValue);
            return newValue;
        }
        var cachedValue = cache3.get(a3);
        if (cachedValue === undefined) {
            var newValue = fn(a1, a2, a3);
            cache3.set(a3, newValue);
            return newValue;
        }
        return cachedValue;
    };
}
export function memoize4(fn) {
    var memoize4Cache = new WeakMap();
    return function memoized(a1, a2, a3, a4) {
        var cache2 = memoize4Cache.get(a1);
        if (!cache2) {
            cache2 = new WeakMap();
            memoize4Cache.set(a1, cache2);
            var cache3_2 = new WeakMap();
            cache2.set(a2, cache3_2);
            var cache4_1 = new WeakMap();
            cache3_2.set(a3, cache4_1);
            var newValue = fn(a1, a2, a3, a4);
            cache4_1.set(a4, newValue);
            return newValue;
        }
        var cache3 = cache2.get(a2);
        if (!cache3) {
            cache3 = new WeakMap();
            cache2.set(a2, cache3);
            var cache4_2 = new WeakMap();
            cache3.set(a3, cache4_2);
            var newValue = fn(a1, a2, a3, a4);
            cache4_2.set(a4, newValue);
            return newValue;
        }
        var cache4 = cache3.get(a3);
        if (!cache4) {
            var cache4_3 = new WeakMap();
            cache3.set(a3, cache4_3);
            var newValue = fn(a1, a2, a3, a4);
            cache4_3.set(a4, newValue);
            return newValue;
        }
        var cachedValue = cache4.get(a4);
        if (cachedValue === undefined) {
            var newValue = fn(a1, a2, a3, a4);
            cache4.set(a4, newValue);
            return newValue;
        }
        return cachedValue;
    };
}
export function memoize5(fn) {
    var memoize5Cache = new WeakMap();
    return function memoized(a1, a2, a3, a4, a5) {
        var cache2 = memoize5Cache.get(a1);
        if (!cache2) {
            cache2 = new WeakMap();
            memoize5Cache.set(a1, cache2);
            var cache3_3 = new WeakMap();
            cache2.set(a2, cache3_3);
            var cache4_4 = new WeakMap();
            cache3_3.set(a3, cache4_4);
            var cache5_1 = new WeakMap();
            cache4_4.set(a4, cache5_1);
            var newValue = fn(a1, a2, a3, a4, a5);
            cache5_1.set(a5, newValue);
            return newValue;
        }
        var cache3 = cache2.get(a2);
        if (!cache3) {
            cache3 = new WeakMap();
            cache2.set(a2, cache3);
            var cache4_5 = new WeakMap();
            cache3.set(a3, cache4_5);
            var cache5_2 = new WeakMap();
            cache4_5.set(a4, cache5_2);
            var newValue = fn(a1, a2, a3, a4, a5);
            cache5_2.set(a5, newValue);
            return newValue;
        }
        var cache4 = cache3.get(a3);
        if (!cache4) {
            cache4 = new WeakMap();
            cache3.set(a3, cache4);
            var cache5_3 = new WeakMap();
            cache4.set(a4, cache5_3);
            var newValue = fn(a1, a2, a3, a4, a5);
            cache5_3.set(a5, newValue);
            return newValue;
        }
        var cache5 = cache4.get(a4);
        if (!cache5) {
            cache5 = new WeakMap();
            cache4.set(a4, cache5);
            var newValue = fn(a1, a2, a3, a4, a5);
            cache5.set(a5, newValue);
            return newValue;
        }
        var cachedValue = cache5.get(a5);
        if (cachedValue === undefined) {
            var newValue = fn(a1, a2, a3, a4, a5);
            cache5.set(a5, newValue);
            return newValue;
        }
        return cachedValue;
    };
}
var memoize2of4cache = new WeakMap();
export function memoize2of4(fn) {
    return function memoized(a1, a2, a3, a4) {
        var cache2 = memoize2of4cache.get(a1);
        if (!cache2) {
            cache2 = new WeakMap();
            memoize2of4cache.set(a1, cache2);
            var newValue = fn(a1, a2, a3, a4);
            cache2.set(a2, newValue);
            return newValue;
        }
        var cachedValue = cache2.get(a2);
        if (cachedValue === undefined) {
            var newValue = fn(a1, a2, a3, a4);
            cache2.set(a2, newValue);
            return newValue;
        }
        return cachedValue;
    };
}
