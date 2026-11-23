/**
 * Process-isolated cold plan compile / amortization / retained-heap probe.
 *
 * Usage:
 *   node --expose-gc scripts/measure-plan-cold-heap.mjs [packageRoot] [outJson]
 *
 * packageRoot defaults to the repo root (resolves @graphql-tools/executor).
 * Prints JSON to stdout and optionally writes outJson.
 *
 * Amortization uses classic warm time:
 *   N = ceil(T_compile / (T_classic − T_planned))
 * Cold/warm ratio is reported separately and must not be treated as amortization.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve as resolvePath } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import v8 from 'node:v8';

const root = resolvePath(process.argv[2] ?? process.cwd());
const outPath = process.argv[3];
const require = createRequire(`${root}/package.json`);
const {
  execute,
  clearExecutionPlanCache,
  compileExecutionPlan,
  isExecutionPlan,
  setExecutionPlanningEnabled,
} = await import(pathToFileURL(require.resolve('@graphql-tools/executor')).href);
const { buildSchema, parse } = await import(pathToFileURL(require.resolve('graphql')).href);

function heapUsed() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
  return process.memoryUsage().heapUsed;
}

function heapEstimate() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
  const stats = v8.getHeapStatistics();
  return {
    heapUsed: process.memoryUsage().heapUsed,
    heapTotal: process.memoryUsage().heapTotal,
    usedHeapSize: stats.used_heap_size,
    external: process.memoryUsage().external,
  };
}

function median(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function mean(samples) {
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

async function measureWarmAsync(run, samples = 50) {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    const r = run();
    if (r?.then) await r;
    times.push(performance.now() - t0);
  }
  return { medianMs: median(times), meanMs: mean(times), samples: times.length };
}

/** Workload builders: SDL + query + rootValue. */
const workloads = {
  denseSkip: {
    label: 'denseSkip (40 Int fields, skip/include mix)',
    sdl() {
      return `type Query {\n${Array.from({ length: 40 }, (_, i) => `  f${i}: Int`).join('\n')}\n}`;
    },
    query() {
      const lines = [];
      for (let i = 0; i < 40; i++) {
        if (i % 4 === 1) lines.push(`    f${i} @skip(if: $s)`);
        else if (i % 4 === 2) lines.push(`    f${i} @include(if: $i)`);
        else if (i % 4 === 3) lines.push(`    f${i} @skip(if: $s) @include(if: $i)`);
        else lines.push(`    f${i}`);
      }
      return `query ($s: Boolean!, $i: Boolean!) {\n${lines.join('\n')}\n}`;
    },
    variables: { s: false, i: true },
    rootValue: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, i])),
  },
  shallowLeafs: {
    label: 'shallowLeafs (8 Int fields, no directives)',
    sdl() {
      return `type Query {\n${Array.from({ length: 8 }, (_, i) => `  f${i}: Int`).join('\n')}\n}`;
    },
    query() {
      return `{\n${Array.from({ length: 8 }, (_, i) => `  f${i}`).join('\n')}\n}`;
    },
    variables: undefined,
    rootValue: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`f${i}`, i])),
  },
  nestedObjects: {
    label: 'nestedObjects (depth 3 × 6 fields)',
    sdl() {
      return `
type L3 { a: Int b: Int c: Int d: Int e: Int f: Int }
type L2 { a: L3 b: L3 c: L3 d: L3 e: L3 f: L3 }
type L1 { a: L2 b: L2 c: L2 d: L2 e: L2 f: L2 }
type Query { root: L1 }
`;
    },
    query() {
      const leaf = '{ a b c d e f }';
      const l2 = `{ a ${leaf} b ${leaf} c ${leaf} d ${leaf} e ${leaf} f ${leaf} }`;
      return `{ root { a ${l2} b ${l2} c ${l2} d ${l2} e ${l2} f ${l2} } }`;
    },
    variables: undefined,
    rootValue: {
      root: (() => {
        const leaf = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
        const l2 = { a: leaf, b: leaf, c: leaf, d: leaf, e: leaf, f: leaf };
        return { a: l2, b: l2, c: l2, d: l2, e: l2, f: l2 };
      })(),
    },
  },
};

const PLAN_COUNTS = [20, 100, 500];

async function probeWorkload(name, spec) {
  const schema = buildSchema(spec.sdl(), { assumeValid: true });
  const document = parse(spec.query());
  const variableValues = spec.variables;
  const rootValue = spec.rootValue;
  const args = { schema, document, variableValues, rootValue };

  setExecutionPlanningEnabled(true);
  clearExecutionPlanCache?.(document);

  const beforeCold = heapUsed();
  const t0 = performance.now();
  const coldResult = execute(args);
  if (coldResult?.then) await coldResult;
  const coldMs = performance.now() - t0;
  const afterCold = heapUsed();

  const plannedWarm = await measureWarmAsync(() => execute(args), 50);

  // Classic warm on a fresh document so we do not reuse the planned cache path.
  setExecutionPlanningEnabled(false);
  const classicDoc = parse(spec.query() + '\n# classic');
  const classicArgs = { ...args, document: classicDoc };
  // Prime once (still classic — no plan).
  {
    const r = execute(classicArgs);
    if (r?.then) await r;
  }
  const classicWarm = await measureWarmAsync(() => execute(classicArgs), 50);
  setExecutionPlanningEnabled(true);

  const tCompileMs = Math.max(0, coldMs - plannedWarm.meanMs);
  const savingsMs = classicWarm.meanMs - plannedWarm.meanMs;
  const amortizationN = savingsMs > 0 ? Math.ceil(tCompileMs / savingsMs) : null;

  // Retained heap: AST-only vs AST+plan across several plan counts.
  const retainedByCount = {};
  for (const planCount of PLAN_COUNTS) {
    clearExecutionPlanCache?.(document);
    const docs = [];
    const heapBeforeAst = heapEstimate();
    for (let i = 0; i < planCount; i++) {
      docs.push(parse(spec.query() + `\n# ast-${name}-${i}`));
    }
    const heapAfterAst = heapEstimate();
    const astRetainedBytes = Math.max(0, heapAfterAst.heapUsed - heapBeforeAst.heapUsed);

    const plans = [];
    const heapBeforePlans = heapEstimate();
    for (let i = 0; i < planCount; i++) {
      const plan = compileExecutionPlan({ schema, document: docs[i] });
      if (isExecutionPlan(plan)) {
        plans.push(plan);
      }
    }
    const heapAfterPlans = heapEstimate();
    const planPlusAstBytes = Math.max(0, heapAfterPlans.heapUsed - heapBeforeAst.heapUsed);
    const planIncrementalBytes = Math.max(0, heapAfterPlans.heapUsed - heapBeforePlans.heapUsed);

    retainedByCount[planCount] = {
      planCount: plans.length,
      astRetainedBytesApprox: astRetainedBytes,
      astBytesPerDocApprox: astRetainedBytes / Math.max(1, planCount),
      planIncrementalBytesApprox: planIncrementalBytes,
      planIncrementalBytesPerPlanApprox: planIncrementalBytes / Math.max(1, plans.length),
      totalAstPlusPlanBytesApprox: planPlusAstBytes,
      totalBytesPerEntryApprox: planPlusAstBytes / Math.max(1, plans.length),
      heapBeforeAst,
      heapAfterAst,
      heapAfterPlans,
    };
    // Keep refs live until end of iteration (docs + plans).
    if (docs.length + plans.length === 0) {
      throw new Error('no docs/plans retained');
    }
  }

  return {
    name,
    label: spec.label,
    coldFirstExecuteMs: coldMs,
    plannedWarmExecuteMsMedian: plannedWarm.medianMs,
    plannedWarmExecuteMsMean: plannedWarm.meanMs,
    classicWarmExecuteMsMedian: classicWarm.medianMs,
    classicWarmExecuteMsMean: classicWarm.meanMs,
    tCompileMsApprox: tCompileMs,
    classicMinusPlannedMs: savingsMs,
    /** Break-even executes: ceil(T_compile / (T_classic − T_planned)). Null if no savings. */
    amortizationBreakEvenN: amortizationN,
    /** Not amortization — cold wall time / planned warm mean only. */
    coldOverWarmRatio: coldMs / plannedWarm.meanMs,
    heapDeltaColdBytes: afterCold - beforeCold,
    retainedByCount,
  };
}

const results = {};
for (const [name, spec] of Object.entries(workloads)) {
  results[name] = await probeWorkload(name, spec);
}

const report = {
  node: process.version,
  root,
  exposeGc: typeof globalThis.gc === 'function',
  formula: 'N = ceil(T_compile / (T_classic - T_planned)); cold/warm is not amortization',
  workloads: results,
  notes: [
    'T_compile ≈ cold first execute − planned warm mean (same DocumentNode).',
    'T_classic / T_planned are warm means with planning disabled / enabled.',
    'amortizationBreakEvenN uses classic−planned savings; coldOverWarmRatio is illustrative only.',
    'Retained heap: parse N distinct docs (AST), then compileExecutionPlan each (plan incremental).',
    'GC noise applies; prefer --expose-gc. Not a Yaacov / gateway comparison.',
  ],
};

const json = JSON.stringify(report, null, 2);
console.log(json);
if (outPath) {
  writeFileSync(outPath, json);
}
