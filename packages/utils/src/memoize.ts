import memoizee from 'memoizee';
import weakMemoizee from 'memoizee/weak.js';

/**
 * Compatibility helpers backed by `memoizee`.
 * Prefer importing `memoizee` / `memoizee/weak.js` directly in new code.
 * These remain for published gateway packages (`delegate`, `stitch`, `wrap`, …).
 *
 * Multi-arg helpers use `memoizee`'s `normalizer` with identity keys (not nested
 * `weakMemoizee` calls). Single-arg helpers use `memoizee/weak`.
 */

const objectIds = new WeakMap<object, string>();
let objectIdSeq = 0;

function objectKey(value: unknown): string {
  if (value != null && (typeof value === 'object' || typeof value === 'function')) {
    let id = objectIds.get(value as object);
    if (id == null) {
      id = `o${++objectIdSeq}`;
      objectIds.set(value as object, id);
    }
    return id;
  }
  return JSON.stringify(value);
}

function identityNormalizer(length: number) {
  return (args: any) => {
    const parts: string[] = [];
    for (let i = 0; i < length; i++) {
      parts.push(objectKey(args[i]));
    }
    return parts.join('|');
  };
}

export function memoize1<F extends (a1: any) => any>(fn: F): F {
  return weakMemoizee(fn as (a1: object) => unknown) as unknown as F;
}

export function memoize2<F extends (a1: any, a2: any) => any>(fn: F): F {
  return memoizee(fn, { length: 2, normalizer: identityNormalizer(2) }) as F;
}

export function memoize3<F extends (a1: any, a2: any, a3: any) => any>(fn: F): F {
  return memoizee(fn, { length: 3, normalizer: identityNormalizer(3) }) as F;
}

export function memoize5<F extends (a1: any, a2: any, a3: any, a4: any, a5: any) => any>(fn: F): F {
  return memoizee(fn, { length: 5, normalizer: identityNormalizer(5) }) as F;
}

/** Cache on the first two arguments only (used by `@graphql-tools/batch-execute`). */
export function memoize2of4<F extends (a1: any, a2: any, a3: any, a4: any) => any>(fn: F): F {
  return memoizee(fn, { length: 2, normalizer: identityNormalizer(2) }) as F;
}
