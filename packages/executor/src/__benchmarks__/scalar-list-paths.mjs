// node --expose-gc packages/executor/src/__benchmarks__/scalar-list-paths.mjs packages/executor 2000000
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

assert(global.gc, 'Run with --expose-gc');
const packageDir = resolve(process.argv[2] || 'packages/executor');
const count = Number(process.argv[3] || 2000000);
assert(Number.isInteger(count) && count > 0 && count <= 2000000);
const pkg = JSON.parse(readFileSync(resolve(packageDir, 'package.json')));
const require = createRequire(resolve(packageDir, 'package.json'));
const { buildSchema, parse } = await import(pathToFileURL(require.resolve('graphql')).href);
const { executeSync } = await import(pathToFileURL(resolve(packageDir, pkg.module)).href);
const schema = buildSchema('type Query { values: [Float!]! }');
const document = parse('{ values }');
executeSync({ schema, document, rootValue: { values: [1, 2] } });
const values = Array.from({ length: count }, (_, index) => index * 1.25);
global.gc();
global.gc();
const cpu = process.cpuUsage();
const start = performance.now();
const result = executeSync({ schema, document, rootValue: { values } });
const elapsedMs = performance.now() - start;
const usage = process.cpuUsage(cpu);
assert.equal(result.errors, undefined);
assert.equal(result.data.values.length, count);
const sha256 = createHash('sha256').update(JSON.stringify(result)).digest('hex');
console.log(
  JSON.stringify({
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    count,
    elapsedMs,
    cpuMs: (usage.user + usage.system) / 1000,
    sha256,
  }),
);
