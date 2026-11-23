/**
 * Process-isolated cold plan compile / amortization / retained-heap probe.
 *
 * Usage:
 *   node --expose-gc scripts/measure-plan-cold-heap.mjs [packageRoot] [outJson]
 *
 * packageRoot defaults to the repo root (resolves @graphql-tools/executor).
 * Prints JSON to stdout and optionally writes outJson.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import v8 from 'node:v8';

const root = process.argv[2] ?? process.cwd();
const outPath = process.argv[3];
const require = createRequire(`${root}/package.json`);
const { execute, clearExecutionPlanCache, compileExecutionPlan, isExecutionPlan } = await import(
  pathToFileURL(require.resolve('@graphql-tools/executor')).href
);
const { buildSchema, parse } = await import(pathToFileURL(require.resolve('graphql')).href);

function denseSkipSDL() {
  return `type Query {\n${Array.from({ length: 40 }, (_, i) => `  f${i}: Int`).join('\n')}\n}`;
}
function denseSkipQuery() {
  const lines = [];
  for (let i = 0; i < 40; i++) {
    if (i % 4 === 1) lines.push(`    f${i} @skip(if: $s)`);
    else if (i % 4 === 2) lines.push(`    f${i} @include(if: $i)`);
    else if (i % 4 === 3) lines.push(`    f${i} @skip(if: $s) @include(if: $i)`);
    else lines.push(`    f${i}`);
  }
  return `query ($s: Boolean!, $i: Boolean!) {\n${lines.join('\n')}\n}`;
}

function heapUsed() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
  return process.memoryUsage().heapUsed;
}

function heapEstimate() {
  // v8.getHeapStatistics is always available; retained after GC is a rough proxy.
  const stats = v8.getHeapStatistics();
  return {
    heapUsed: process.memoryUsage().heapUsed,
    heapTotal: process.memoryUsage().heapTotal,
    usedHeapSize: stats.used_heap_size,
    external: process.memoryUsage().external,
  };
}

const schema = buildSchema(denseSkipSDL(), { assumeValid: true });
const document = parse(denseSkipQuery());
const variableValues = { s: false, i: true };
const rootValue = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, i]));

clearExecutionPlanCache?.(document);

const beforeCold = heapUsed();
const t0 = performance.now();
const coldResult = execute({ schema, document, variableValues, rootValue });
if (coldResult?.then) await coldResult;
const coldMs = performance.now() - t0;
const afterCold = heapUsed();

// Warm execute (plan cached)
const warmSamples = [];
for (let i = 0; i < 50; i++) {
  const tw = performance.now();
  const r = execute({ schema, document, variableValues, rootValue });
  if (r?.then) await r;
  warmSamples.push(performance.now() - tw);
}
warmSamples.sort((a, b) => a - b);
const warmMsMedian = warmSamples[Math.floor(warmSamples.length / 2)];
const warmMsMean = warmSamples.reduce((a, b) => a + b, 0) / warmSamples.length;

// Amortization: how many warm executes until cumulative warm savings offset cold.
// coldCost ≈ coldMs - warmMsMean; break-even ≈ coldCost / warmMsMean extra vs warm-only...
// More useful: coldMs / warmMsMean ≈ how many warm executes fit in one cold.
const coldOverWarm = coldMs / warmMsMean;

// Explicit compile path for plan-only retained heap estimate.
clearExecutionPlanCache?.(document);
const heapBeforePlans = heapEstimate();
const plans = [];
const planCount = 20;
for (let i = 0; i < planCount; i++) {
  // Fresh DocumentNode identity each time so each compile retains a plan entry.
  const doc = parse(denseSkipQuery() + `\n# ${i}`);
  const plan = compileExecutionPlan({ schema, document: doc });
  if (isExecutionPlan(plan)) {
    plans.push(plan);
  }
}
const heapAfterPlans = heapEstimate();
const retainedBytesApprox = Math.max(0, heapAfterPlans.heapUsed - heapBeforePlans.heapUsed);
const bytesPerPlanApprox = retainedBytesApprox / Math.max(1, plans.length);

const report = {
  node: process.version,
  root,
  bench: 'denseSkip',
  exposeGc: typeof globalThis.gc === 'function',
  coldFirstExecuteMs: coldMs,
  warmExecuteMsMedian: warmMsMedian,
  warmExecuteMsMean: warmMsMean,
  coldOverWarmRatio: coldOverWarm,
  /** Rough: cold first execute takes ~N warm executes of wall time. */
  amortizationWarmExecutesApprox: coldOverWarm,
  heapDeltaColdBytes: afterCold - beforeCold,
  planRetained: {
    planCount: plans.length,
    heapBefore: heapBeforePlans,
    heapAfter: heapAfterPlans,
    retainedBytesApprox,
    bytesPerPlanApprox,
  },
  notes: [
    'Cold = first execute on a fresh DocumentNode (includes plan compile).',
    'Warm = subsequent execute on the same DocumentNode (plan cache hit).',
    'Retained heap is process-isolated RSS/heapUsed delta after compiling N distinct plans; GC noise applies.',
    'Not a Yaacov / gateway comparison — executor micro-probe only.',
  ],
};

const json = JSON.stringify(report, null, 2);
console.log(json);
if (outPath) {
  writeFileSync(outPath, json);
}
