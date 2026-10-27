// After building the package, compare fresh processes with:
// node --expose-gc packages/executor/src/__benchmarks__/list-storage.mjs packages/executor 500000
// An unpacked npm package directory can also be supplied as the first argument.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

assert(global.gc, 'Run with --expose-gc');
const packageDir = resolve(process.argv[2] || 'packages/executor');
const count = Number(process.argv[3] || 500000);
assert(Number.isInteger(count) && count > 0 && count <= 1000000);
const packageJSON = JSON.parse(readFileSync(resolve(packageDir, 'package.json')));
const require = createRequire(resolve(packageDir, 'package.json'));
const { buildSchema, parse } = await import(pathToFileURL(require.resolve('graphql')).href);
const { executeSync } = await import(pathToFileURL(resolve(packageDir, packageJSON.module)).href);
const schema = buildSchema('type Query { matrix: [[Float!]!]! }');
const document = parse('{ matrix }');
executeSync({ schema, document, rootValue: { matrix: [[1, 2]] } });
const matrix = Array.from({ length: count }, (_, index) => [index, index % 97]);
global.gc();
global.gc();
const inputReadyHeap = process.memoryUsage().heapUsed;
const start = performance.now();
const result = executeSync({ schema, document, rootValue: { matrix } });
const elapsedMs = performance.now() - start;
assert.equal(result.errors, undefined);
globalThis.retainedListBenchmarkResult = result;
global.gc();
global.gc();
const addedRetainedBytes = process.memoryUsage().heapUsed - inputReadyHeap;
assert.equal(result.data.matrix.length, count);
assert.deepEqual(result.data.matrix[0], [0, 0]);
assert.deepEqual(result.data.matrix[count - 1], [count - 1, (count - 1) % 97]);
const sha256 = createHash('sha256').update(JSON.stringify(result)).digest('hex');
console.log(
  JSON.stringify({
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    count,
    addedRetainedBytes,
    elapsedMs,
    sha256,
  }),
);
