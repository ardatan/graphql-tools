/**
 * WeakMap memoize* helpers are on the executor / stitching hot path.
 * Requires a prior `npm run build`. Run with: npm run test:bench
 */
import { test } from 'vitest';
import { memoize2, memoize3 } from '@graphql-tools/utils';

function writeOpts(name: string): { writeResult: string } | Record<string, never> {
  return process.env['BENCH_WRITE'] ? { writeResult: `./benchmarks/results/${name}.json` } : {};
}

const memoize2Fn = memoize2((a: object, b: object) => ({ a, b }));
const memoize3Fn = memoize3((a: object, b: object, c: object) => ({ a, b, c }));

const keys2 = Array.from({ length: 64 }, () => [{}, {}] as const);
const keys3 = Array.from({ length: 64 }, () => [{}, {}, {}] as const);

// Warm caches once outside the measured loop.
for (const [a, b] of keys2) {
  memoize2Fn(a, b);
}
for (const [a, b, c] of keys3) {
  memoize3Fn(a, b, c);
}

test('utils memoize benchmarks', async ({ bench }) => {
  await bench('memoize2 cache hit', { ...writeOpts('utils-memoize2-hit') }, () => {
    let last: unknown;
    for (const [a, b] of keys2) {
      last = memoize2Fn(a, b);
    }
    return last;
  }).run();

  await bench('memoize3 cache hit', { ...writeOpts('utils-memoize3-hit') }, () => {
    let last: unknown;
    for (const [a, b, c] of keys3) {
      last = memoize3Fn(a, b, c);
    }
    return last;
  }).run();
});
