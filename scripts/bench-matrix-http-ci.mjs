#!/usr/bin/env node
/**
 * Yoga + Hive Gateway HTTP three-way benches for the sticky bench-matrix comment.
 *
 * Sides: master / tip classic / tip planned (compiled dist via package resolutions or
 * GRAPHQL_TOOLS_EXECUTOR_PLANNING).
 *
 * - Yoga: graphql-yoga benchmark schema shape + `authors` query
 *   (https://github.com/graphql-hive/graphql-yoga/tree/main/benchmark)
 * - Hive: gateway `e2e/federation-example` (TestQuery) with executor resolutions
 *   (clone + yarn as needed; no proxy path)
 *
 * Env (BENCH_MATRIX_* preferred; CLAIM_BENCH_* aliases accepted):
 *   BENCH_MATRIX_TIP_ROOT / BENCH_MATRIX_MASTER_ROOT
 *   BENCH_MATRIX_WARM_MS / BENCH_MATRIX_MEASURE_MS / BENCH_MATRIX_HTTP_SAMPLES
 *   BENCH_MATRIX_SKIP_YOGA / BENCH_MATRIX_SKIP_HIVE
 *   BENCH_MATRIX_HIVE_GATEWAY_DIR — clone dir (default: os tmp)
 *   BENCH_MATRIX_HIVE_GATEWAY_REF — git ref (default: main)
 *   BENCH_MATRIX_OUT_JSON — write path (default benchmarks/results/bench-matrix-http.json)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function env(name, fallback = undefined) {
  const alias = name.replace(/^BENCH_MATRIX_/, 'CLAIM_BENCH_');
  return process.env[name] ?? process.env[alias] ?? fallback;
}

const tipRoot = resolve(
  env('BENCH_MATRIX_TIP_ROOT') || fileURLToPath(new URL('..', import.meta.url)),
);
const masterRoot = resolve(env('BENCH_MATRIX_MASTER_ROOT') || '');
if (!masterRoot || !existsSync(masterRoot)) {
  console.error('BENCH_MATRIX_MASTER_ROOT must point at a built master worktree.');
  process.exit(2);
}

const warmMs = Math.max(100, Number(env('BENCH_MATRIX_WARM_MS', '300')) || 300);
const measureMs = Math.max(200, Number(env('BENCH_MATRIX_MEASURE_MS', '900')) || 900);
const httpSamples = Math.max(1, Number(env('BENCH_MATRIX_HTTP_SAMPLES', '2')) || 2);
const skipYoga = env('BENCH_MATRIX_SKIP_YOGA') === '1';
const skipHive = env('BENCH_MATRIX_SKIP_HIVE') === '1';
const hiveGatewayDir =
  env('BENCH_MATRIX_HIVE_GATEWAY_DIR') || join(tmpdir(), 'graphql-tools-hive-gateway-ci');
const hiveGatewayRef = env('BENCH_MATRIX_HIVE_GATEWAY_REF', 'main');
const outJson = resolve(
  tipRoot,
  env('BENCH_MATRIX_OUT_JSON', 'benchmarks/results/bench-matrix-http.json'),
);

const AUTHORS_QUERY = `
query authors {
  authors {
    id
    name
    company
    books {
      id
      name
      numPages
    }
  }
}
`;

/**
 * Deterministic Yoga benchmark schema (same shape as graphql-yoga/benchmark/schema.ts).
 *
 * packageRoot must be the same worktree that owns both graphql-yoga and the executor
 * dist under test. Mixing tip Yoga (tip graphql) with a master worktree executor
 * (master graphql after npm ci) yields "GraphQLSchema from another module" → Yoga
 * INTERNAL_SERVER_ERROR.
 */
function yogaAuthorsChildSource({ packageRoot, planning, warm, measure }) {
  return `
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { inspect } from 'node:util';

const packageRoot = ${JSON.stringify(packageRoot)};
const planning = ${JSON.stringify(planning)};
const require = createRequire(packageRoot + '/package.json');
const { createSchema, createYoga } = await import(
  pathToFileURL(require.resolve('graphql-yoga')).href
);
const ex = require(packageRoot + '/packages/executor/dist/cjs/index.js');
if (typeof ex.setExecutionPlanningEnabled === 'function') {
  ex.setExecutionPlanningEnabled(planning);
  ex.clearExecutionPlanCache?.();
}
const execute = ex.execute;

const authors = [];
for (let i = 0; i < 20; i++) {
  const books = [];
  for (let k = 0; k < 3; k++) {
    books.push({
      id: 'b-' + i + '-' + k,
      name: 'book-' + i + '-' + k + '.example',
      numPages: ((i * 3 + k) % 1000) + 1,
    });
  }
  authors.push({
    id: 'a-' + i,
    name: 'Author ' + i,
    company: 'Company ' + i,
    books,
  });
}

const schema = createSchema({
  typeDefs: \`
    type Author {
      id: ID!
      name: String!
      company: String!
      books: [Book!]!
    }
    type Book {
      id: ID!
      name: String!
      numPages: Int!
    }
    type Query {
      authors: [Author!]!
    }
  \`,
  resolvers: {
    Query: { authors: () => authors },
  },
});

function formatGraphqlError(err) {
  const bits = [inspect(err, { depth: 6, breakLength: 120 })];
  if (err?.originalError) {
    bits.push('originalError: ' + inspect(err.originalError, { depth: 6, breakLength: 120 }));
  }
  if (err?.extensions) {
    bits.push('extensions: ' + inspect(err.extensions, { depth: 6, breakLength: 120 }));
  }
  return bits.join('\\n');
}

const body = JSON.stringify({ query: ${JSON.stringify(AUTHORS_QUERY)} });
const yoga = createYoga({
  schema,
  logging: false,
  multipart: false,
  // Surface the real execute error (e.g. dual-graphql realm mismatch) in CI logs.
  maskedErrors: false,
  plugins: [
    {
      onExecute({ setExecuteFn }) {
        setExecuteFn(args => execute(args));
      },
    },
  ],
});
const url = 'http://yoga/graphql';
const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body };
const warmMs = ${warm};
const measureMs = ${measure};
let t = performance.now();
while (performance.now() - t < warmMs) {
  const r = await yoga.fetch(url, init);
  const json = await r.json();
  if (json.errors?.length) {
    throw new Error('Yoga authors warm failed:\\n' + formatGraphqlError(json.errors[0]));
  }
}
let ops = 0;
const t0 = performance.now();
while (performance.now() - t0 < measureMs) {
  const r = await yoga.fetch(url, init);
  const json = await r.json();
  if (json.errors?.length) {
    throw new Error('Yoga authors measure failed:\\n' + formatGraphqlError(json.errors[0]));
  }
  ops++;
}
const elapsed = performance.now() - t0;
console.log(JSON.stringify({ hz: (ops / elapsed) * 1000, ops, elapsedMs: elapsed }));
`;
}

function runEsmChild(source, cwd) {
  const dir = mkdtempSync(join(tmpdir(), 'claim-http-'));
  const script = join(dir, 'run.mjs');
  writeFileSync(script, source);
  const result = spawnSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    env: process.env,
    timeout: Math.max(180_000, (warmMs + measureMs) * 8),
  });
  rmSync(dir, { recursive: true, force: true });
  if (result.status !== 0) {
    throw new Error(
      `HTTP child failed (status=${result.status}):\n--- stderr ---\n${result.stderr || ''}\n--- stdout ---\n${result.stdout || ''}`,
    );
  }
  const line = result.stdout.trim().split('\n').filter(Boolean).pop();
  const parsed = JSON.parse(line);
  if (typeof parsed.hz !== 'number' || !Number.isFinite(parsed.hz)) {
    throw new Error(`bad hz payload: ${line}`);
  }
  return parsed.hz;
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function pct(n) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

/** True when the built executor exports `setExecutionPlanningEnabled`. */
function packageHasPlanning(packageRoot) {
  try {
    const req = createRequire(join(packageRoot, 'package.json'));
    const ex = req(join(packageRoot, 'packages/executor/dist/cjs/index.js'));
    return typeof ex.setExecutionPlanningEnabled === 'function';
  } catch {
    return false;
  }
}

const masterHasPlanning = packageHasPlanning(masterRoot);

function threeWay(measureFn) {
  const masterClassicSamples = [];
  const masterPlannedSamples = [];
  const tipClassicSamples = [];
  const tipPlannedSamples = [];
  for (let i = 0; i < httpSamples; i++) {
    masterClassicSamples.push(measureFn({ side: 'master', planning: false }));
    if (masterHasPlanning) {
      masterPlannedSamples.push(measureFn({ side: 'master', planning: true }));
    }
    tipClassicSamples.push(measureFn({ side: 'tip', planning: false }));
    tipPlannedSamples.push(measureFn({ side: 'tip', planning: true }));
  }
  const masterClassicHz = mean(masterClassicSamples);
  const masterPlannedHz = masterHasPlanning ? mean(masterPlannedSamples) : null;
  const tipClassicHz = mean(tipClassicSamples);
  const tipPlannedHz = mean(tipPlannedSamples);
  const masterForPlannedHz = masterPlannedHz ?? masterClassicHz;
  return {
    masterClassicHz,
    masterPlannedHz,
    masterHz: masterClassicHz,
    tipClassicHz,
    tipPlannedHz,
    masterHasPlanning,
    masterPlannedBaseline: masterHasPlanning ? 'planned' : 'classic',
    // (1) tip planned vs tip classic
    deltaPlannedVsClassicPct: (tipPlannedHz / tipClassicHz - 1) * 100,
    // (2) tip planned vs master planned (else master classic)
    deltaPlannedVsMasterPct: (tipPlannedHz / masterForPlannedHz - 1) * 100,
    // (3) tip classic vs master classic
    deltaClassicVsMasterPct: (tipClassicHz / masterClassicHz - 1) * 100,
  };
}

function measureYogaAuthors({ side, planning }) {
  // Same worktree for Yoga + executor so both share one `graphql` instance.
  const packageRoot = side === 'master' ? masterRoot : tipRoot;
  return runEsmChild(
    yogaAuthorsChildSource({
      packageRoot,
      planning,
      warm: warmMs,
      measure: measureMs,
    }),
    packageRoot,
  );
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: opts.stdio || 'pipe',
    env: { ...process.env, ...(opts.env || {}) },
    cwd: opts.cwd,
    timeout: opts.timeout,
  });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function packExecutor(packageRoot, label) {
  const pkgDir = join(packageRoot, 'packages/executor');
  const dist = join(pkgDir, 'dist/cjs/index.js');
  if (!existsSync(dist)) {
    throw new Error(`${label} missing executor dist at ${dist}`);
  }
  const outDir = mkdtempSync(join(tmpdir(), `executor-pack-${label}-`));
  const packed = run('npm', ['pack', '--pack-destination', outDir], { cwd: pkgDir });
  const name = packed.stdout.trim().split('\n').filter(Boolean).pop();
  return join(outDir, name);
}

function ensureHiveGatewayClone() {
  if (existsSync(join(hiveGatewayDir, 'e2e/federation-example/federation-example.bench.ts'))) {
    return;
  }
  mkdirSync(hiveGatewayDir, { recursive: true });
  console.log(`\n==> Cloning graphql-hive/gateway (${hiveGatewayRef}) → ${hiveGatewayDir}\n`);
  if (existsSync(join(hiveGatewayDir, '.git'))) {
    run('git', ['fetch', '--depth', '1', 'origin', hiveGatewayRef], { cwd: hiveGatewayDir });
    run('git', ['checkout', '-f', 'FETCH_HEAD'], { cwd: hiveGatewayDir });
  } else {
    rmSync(hiveGatewayDir, { recursive: true, force: true });
    run('git', [
      'clone',
      '--depth',
      '1',
      '--branch',
      hiveGatewayRef,
      'https://github.com/graphql-hive/gateway.git',
      hiveGatewayDir,
    ]);
  }
}

function ensureHiveGatewayInstall() {
  if (existsSync(join(hiveGatewayDir, 'node_modules/@graphql-hive/gateway'))) {
    return;
  }
  console.log('\n==> yarn install in Hive Gateway clone\n');
  run('corepack', ['enable'], { cwd: hiveGatewayDir });
  run('yarn', ['install'], {
    cwd: hiveGatewayDir,
    stdio: 'inherit',
    timeout: 30 * 60_000,
  });
}

function applyExecutorResolution(tarballPath) {
  // Yarn 4: set resolution then install to refresh nested copies.
  run('yarn', ['set', 'resolution', '@graphql-tools/executor@*', `file:${tarballPath}`], {
    cwd: hiveGatewayDir,
  });
  run('yarn', ['install'], {
    cwd: hiveGatewayDir,
    timeout: 15 * 60_000,
  });
}

/**
 * Run federation-example bench and parse "Hive Gateway w/ Tools" hz from vitest output.
 * Only the Tools case is reported; Rust QP row is ignored for the sticky table.
 */
function runHiveFederationToolsHz({ planning }) {
  const env = {
    ...process.env,
    CI: 'true',
    E2E_GATEWAY_RUNNER: 'node',
    PRODUCTS_SIZE: process.env.CLAIM_BENCH_HIVE_PRODUCTS_SIZE || '1000',
    BENCH_DURATION: process.env.CLAIM_BENCH_HIVE_DURATION_MS || '5000',
    BENCH_WARMUP_TIME: process.env.CLAIM_BENCH_HIVE_WARMUP_MS || '1000',
    GRAPHQL_TOOLS_EXECUTOR_PLANNING: planning ? '1' : '0',
  };
  // Vitest names the bench project `bench (bench)` when invoked via `vitest bench`.
  // `--reporter=verbose` is required so the hz table is printed (default reporter omits it).
  const result = spawnSync(
    'yarn',
    [
      'vitest',
      'bench',
      '--run',
      '--project',
      'bench (bench)',
      '--reporter=verbose',
      'e2e/federation-example/federation-example.bench.ts',
    ],
    {
      cwd: hiveGatewayDir,
      encoding: 'utf8',
      env,
      timeout: 10 * 60_000,
    },
  );
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    throw new Error(`Hive federation bench failed (${result.status}): ${out.slice(-4000)}`);
  }
  // Vitest bench table lines look like:
  //   Hive Gateway w/ Tools                      122.50  6.8328  ...
  const toolsLine = out
    .split('\n')
    .find(line => /Hive Gateway w\/ Tools/i.test(line) && !/Hive Router Query Planner/i.test(line));
  if (!toolsLine) {
    throw new Error(`Could not find "Hive Gateway w/ Tools" in bench output:\n${out.slice(-3000)}`);
  }
  const nums = toolsLine.match(/(\d+(?:\.\d+)?)/g);
  if (!nums || nums.length === 0) {
    throw new Error(`Could not parse hz from: ${toolsLine}`);
  }
  // First number after the name is hz.
  const hz = Number(nums.find(n => n.includes('.')) || nums[0]);
  if (!Number.isFinite(hz) || hz <= 0) {
    throw new Error(`Bad Tools hz from: ${toolsLine}`);
  }
  return { hz, rawLine: toolsLine.trim() };
}

const payload = {
  measuredAt: new Date().toISOString(),
  tipRoot,
  masterRoot,
  warmMs,
  measureMs,
  httpSamples,
  masterHasPlanning,
  yoga: null,
  hive: null,
  hiveNote: null,
};

if (!skipYoga) {
  console.log('\n==> Yoga authors HTTP three-way (benchmark schema + query)\n');
  const row = threeWay(measureYogaAuthors);
  payload.yoga = {
    bench: 'yoga-benchmark-authors-http',
    fixture: 'graphql-yoga/benchmark schema + authors query',
    ...row,
  };
  console.log(
    `Yoga authors: mc=${Math.round(row.masterClassicHz)} tc=${Math.round(row.tipClassicHz)} tp=${Math.round(row.tipPlannedHz)} Δp/c=${pct(row.deltaPlannedVsClassicPct)} Δp/m=${pct(row.deltaPlannedVsMasterPct)}(${row.masterPlannedBaseline}) Δc/m=${pct(row.deltaClassicVsMasterPct)}`,
  );
}

if (!skipHive) {
  try {
    ensureHiveGatewayClone();
    ensureHiveGatewayInstall();
    const tipPack = packExecutor(tipRoot, 'tip');
    const masterPack = packExecutor(masterRoot, 'master');

    console.log('\n==> Hive federation-example (TestQuery) — tip executor resolution\n');
    applyExecutorResolution(tipPack);
    // Same tip package for classic vs planned; only GRAPHQL_TOOLS_EXECUTOR_PLANNING differs.
    const tipClassic = runHiveFederationToolsHz({ planning: false });
    const tipPlanned = runHiveFederationToolsHz({ planning: true });

    console.log('\n==> Hive federation-example — master executor resolution\n');
    applyExecutorResolution(masterPack);
    const masterClassic = runHiveFederationToolsHz({ planning: false });
    const masterPlanned = masterHasPlanning ? runHiveFederationToolsHz({ planning: true }) : null;
    const masterForPlannedHz = masterPlanned?.hz ?? masterClassic.hz;

    payload.hive = {
      bench: 'hive-gateway-federation-example',
      fixture: 'graphql-hive/gateway e2e/federation-example TestQuery',
      masterClassicHz: masterClassic.hz,
      masterPlannedHz: masterPlanned?.hz ?? null,
      masterHz: masterClassic.hz,
      tipClassicHz: tipClassic.hz,
      tipPlannedHz: tipPlanned.hz,
      masterHasPlanning,
      masterPlannedBaseline: masterHasPlanning ? 'planned' : 'classic',
      deltaPlannedVsClassicPct: (tipPlanned.hz / tipClassic.hz - 1) * 100,
      deltaPlannedVsMasterPct: (tipPlanned.hz / masterForPlannedHz - 1) * 100,
      deltaClassicVsMasterPct: (tipClassic.hz / masterClassic.hz - 1) * 100,
      productsSize: Number(process.env.CLAIM_BENCH_HIVE_PRODUCTS_SIZE || '1000'),
      raw: {
        masterClassic: masterClassic.rawLine,
        masterPlanned: masterPlanned?.rawLine ?? null,
        tipClassic: tipClassic.rawLine,
        tipPlanned: tipPlanned.rawLine,
      },
    };
    payload.hiveNote =
      'Hive Gateway `e2e/federation-example` (federation TestQuery, PRODUCTS_SIZE configurable). Executor via yarn resolution to packed `@graphql-tools/executor`. Tip classic uses `GRAPHQL_TOOLS_EXECUTOR_PLANNING=0`. No proxy path. ' +
      (masterHasPlanning
        ? 'Δ planned vs master uses master planned.'
        : 'Δ planned vs master uses master classic (baseline has no planning API).');
    console.log(
      `Hive federation: mc=${payload.hive.masterClassicHz.toFixed(2)} tc=${payload.hive.tipClassicHz.toFixed(2)} tp=${payload.hive.tipPlannedHz.toFixed(2)} Δp/c=${pct(payload.hive.deltaPlannedVsClassicPct)} Δp/m=${pct(payload.hive.deltaPlannedVsMasterPct)}(${payload.hive.masterPlannedBaseline}) Δc/m=${pct(payload.hive.deltaClassicVsMasterPct)}`,
    );
  } catch (error) {
    payload.hiveNote = `Hive federation-example bench failed: ${error.message}`;
    console.warn(payload.hiveNote);
  }
}

mkdirSync(join(outJson, '..'), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`\nWrote ${outJson}\n`);
