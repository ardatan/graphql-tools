#!/usr/bin/env node
/**
 * Process-isolated bench matrix vs latest origin/master (Node 22, compiled dist).
 *
 * Writes:
 *   benchmarks/results/bench-matrix.json
 *   benchmarks/results/bench-matrix.md
 *
 * Sticky markdown (process-isolated; upserted each commit) is a three-way matrix only:
 *   tipClassic vs origin/master HEAD, tipPlanned vs that master, tipClassic vs tipPlanned
 * for execute scenarios, executeSync key rows, Yoga authors, and Hive federation-example.
 *
 * Env:
 *   BENCH_MATRIX_BASE_REF     — baseline ref (default master; always fetched from origin)
 *   BENCH_MATRIX_WARM_MS      — warm budget per child (default 300)
 *   BENCH_MATRIX_MEASURE_MS   — measure budget per child (default 900)
 *   BENCH_MATRIX_SAMPLES      — samples per side (default 3)
 *   BENCH_MATRIX_HTTP_SAMPLES — HTTP three-way samples (default BENCH_MATRIX_SAMPLES)
 *   BENCH_MATRIX_SKIP_HTTP    — '1' to skip Yoga / Hive sections
 *   CLAIM_BENCH_*             — accepted aliases for the BENCH_MATRIX_* vars above
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
// Always compare against latest origin/master (not PR merge-base / GITHUB_BASE_REF).
function env(name, fallback = undefined) {
  return (
    process.env[name] ?? process.env[name.replace(/^BENCH_MATRIX_/, 'CLAIM_BENCH_')] ?? fallback
  );
}

const baseRef = env('BENCH_MATRIX_BASE_REF', 'master');
const baseRemoteRef = baseRef.startsWith('origin/') ? baseRef : `origin/${baseRef}`;
const warmMs = Math.max(100, Number(env('BENCH_MATRIX_WARM_MS', '300')) || 300);
const measureMs = Math.max(200, Number(env('BENCH_MATRIX_MEASURE_MS', '900')) || 900);
const samples = Math.max(1, Number(env('BENCH_MATRIX_SAMPLES', '3')) || 3);
const httpSamples = Math.max(
  1,
  Number(env('BENCH_MATRIX_HTTP_SAMPLES', String(samples))) || samples,
);
const skipHttp = env('BENCH_MATRIX_SKIP_HTTP') === '1';

/** execute() scenarios in the sticky three-way matrix. */
const EXECUTE_CASES = {
  syncList: { label: 'Sync leaf list (1000)' },
  asyncList: { label: 'Async leaf list (1000)' },
  asyncRoot: { label: 'Async root fields (1000)' },
  nested: { label: 'Nested default-resolver (200)' },
  denseSkip: { label: 'Dense @skip/@include (40)' },
  fragmentsAbstract: { label: 'fragmentsAbstract' },
  mixedSyncMethods: { label: 'mixedSyncMethods' },
};

/** executeSync key rows (same three-way matrix). */
const SYNC_API_CASES = [
  { id: 'syncApiSyncList', label: 'executeSync syncList', bench: 'syncList' },
  { id: 'syncApiNested', label: 'executeSync nestedDefault', bench: 'nested' },
  { id: 'syncApiFragments', label: 'executeSync fragmentsAbstract', bench: 'fragmentsAbstract' },
  { id: 'syncApiMixed', label: 'executeSync mixedSyncMethods', bench: 'mixedSyncMethods' },
];

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}`);
  }
}

function runCapture(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.stdout || result.status}`,
    );
  }
  return (result.stdout || '').trim();
}

function childSource({ packageRoot, bench, planning, api, warm, measure }) {
  return `
const { createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');
const requireFromRoot = createRequire(${JSON.stringify(packageRoot + '/package.json')});
const ex = requireFromRoot(${JSON.stringify(packageRoot + '/packages/executor/dist/cjs/index.js')});
const { buildSchema, parse } = requireFromRoot('graphql');
const planning = ${JSON.stringify(planning)};
const bench = ${JSON.stringify(bench)};
const api = ${JSON.stringify(api)};
ex.setExecutionPlanningEnabled?.(planning);
ex.clearExecutionPlanCache?.();
function denseSkipSDL() {
  return 'type Query {\\n' + Array.from({ length: 40 }, (_, i) => '  f' + i + ': Int').join('\\n') + '\\n}';
}
function denseSkipQuery() {
  const lines = [];
  for (let i = 0; i < 40; i++) {
    if (i % 4 === 1) lines.push('    f' + i + ' @skip(if: $s)');
    else if (i % 4 === 2) lines.push('    f' + i + ' @include(if: $i)');
    else if (i % 4 === 3) lines.push('    f' + i + ' @skip(if: $s) @include(if: $i)');
    else lines.push('    f' + i);
  }
  return 'query ($s: Boolean!, $i: Boolean!) {\\n' + lines.join('\\n') + '\\n}';
}
function syncListField() {
  const r = [];
  for (let i = 0; i < 1000; i++) r.push(i);
  return r;
}
function asyncListField() {
  const r = [];
  for (let i = 0; i < 1000; i++) r.push(Promise.resolve(i));
  return r;
}
let run;
if (bench === 'syncList' || bench === 'asyncList') {
  const schema = buildSchema('type Query { listField: [String] }', { assumeValid: true });
  const document = parse('{ listField }');
  const fn = bench === 'asyncList' ? asyncListField : syncListField;
  run = () => ex[api]({ schema, document, rootValue: { listField: fn } });
} else if (bench === 'asyncRoot') {
  const names = Array.from({ length: 1000 }, (_, i) => 'f' + i);
  const schema = buildSchema(
    'type Query { ' + names.map(n => n + ': Int').join(' ') + ' }',
    { assumeValid: true },
  );
  const document = parse('{ ' + names.join(' ') + ' }');
  const rootValue = Object.fromEntries(names.map((n, i) => [n, () => Promise.resolve(i)]));
  run = () => ex[api]({ schema, document, rootValue });
} else if (bench === 'nested') {
  const schema = buildSchema(
    'type Friend { name: String } type Item { name: String friend: Friend } type Query { items: [Item] }',
    { assumeValid: true },
  );
  const document = parse('{ items { name friend { name } } }');
  const rootValue = {
    items: Array.from({ length: 200 }, (_, i) => ({
      name: 'item-' + i,
      friend: { name: 'friend-' + i },
    })),
  };
  run = () => ex[api]({ schema, document, rootValue });
} else if (bench === 'denseSkip') {
  const schema = buildSchema(denseSkipSDL(), { assumeValid: true });
  const document = parse(denseSkipQuery());
  const rootValue = Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['f' + i, i]));
  let skipToggle = false;
  run = () => {
    skipToggle = !skipToggle;
    return ex[api]({
      schema,
      document,
      rootValue,
      variableValues: { s: skipToggle, i: !skipToggle },
    });
  };
} else if (bench === 'mixedSyncMethods') {
  const schema = buildSchema(
    'type Query { a: Int b: Int c: Int d: Int }',
    { assumeValid: true },
  );
  const document = parse('{ a b c d }');
  const rootValue = { a: 1, b: () => 2, c: 3, d: () => 4 };
  run = () => ex[api]({ schema, document, rootValue });
} else if (bench === 'fragmentsAbstract') {
  const schema = buildSchema(
    'interface Node { id: ID } type User implements Node { id: ID, name: String } type Post implements Node { id: ID, title: String } union Entity = User | Post type Query { nodes: [Node], entities: [Entity] }',
    { assumeValid: true },
  );
  const document = parse(
    '{ nodes { id ... on User { name } ... on Post { title } } entities { ... on User { id name } ... on Post { id title } } }',
  );
  const rootValue = {
    nodes: [
      { __typename: 'User', id: '1', name: 'a' },
      { __typename: 'Post', id: '2', title: 't' },
    ],
    entities: [
      { __typename: 'User', id: '3', name: 'b' },
      { __typename: 'Post', id: '4', title: 'u' },
    ],
  };
  run = () => ex[api]({ schema, document, rootValue });
} else {
  throw new Error('unknown bench ' + bench);
}
(async () => {
  const endW = performance.now() + ${warm};
  while (performance.now() < endW) {
    const r = run();
    if (r && typeof r.then === 'function') await r;
  }
  let ops = 0;
  const t0 = performance.now();
  const end = t0 + ${measure};
  while (performance.now() < end) {
    const r = run();
    if (r && typeof r.then === 'function') await r;
    ops++;
  }
  console.log(JSON.stringify({ hz: ops / ((performance.now() - t0) / 1000) }));
})().catch(err => {
  console.error(err);
  process.exit(1);
});
`;
}

function measureHz({ packageRoot, bench, planning, api }) {
  const dir = mkdtempSync(join(tmpdir(), 'claim-bench-child-'));
  const script = join(dir, 'run.cjs');
  writeFileSync(
    script,
    childSource({
      packageRoot,
      bench,
      planning,
      api,
      warm: warmMs,
      measure: measureMs,
    }),
  );
  const result = spawnSync(process.execPath, [script], {
    cwd: packageRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_PATH: [join(packageRoot, 'node_modules'), process.env.NODE_PATH || '']
        .filter(Boolean)
        .join(':'),
    },
    timeout: Math.max(120_000, (warmMs + measureMs) * 4),
  });
  rmSync(dir, { recursive: true, force: true });
  if (result.status !== 0) {
    throw new Error(
      `child failed (${bench} planning=${planning} api=${api}): ${result.stderr || result.stdout}`,
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

function ensureDist(packageRoot, label) {
  const dist = join(packageRoot, 'packages/executor/dist/cjs/index.js');
  if (!existsSync(dist)) {
    throw new Error(`${label} missing executor dist at ${dist}`);
  }
}

const resultsDir = join(root, 'benchmarks/results');
const RESULTS_JSON = join(resultsDir, 'bench-matrix.json');
const RESULTS_MD = join(resultsDir, 'bench-matrix.md');
const MARKER = '<!-- graphql-tools-bench-matrix-v1 -->';
mkdirSync(resultsDir, { recursive: true });

function writeFailureArtifact(error) {
  const msg = error?.message || String(error);
  const stubMd = [
    MARKER,
    '## Bench matrix vs origin/master (process-isolated)',
    '',
    `_Harness failed before benches completed: ${msg}_`,
    '',
  ].join('\n');
  writeFileSync(RESULTS_MD, `${stubMd}\n`);
  writeFileSync(
    RESULTS_JSON,
    `${JSON.stringify({ error: msg, measuredAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.warn(`Wrote failure stub to ${RESULTS_MD}`);
}

try {
  // --- build tip ---
  console.log('\n==> Building current checkout for claim benches\n');
  run('npm', ['run', 'build']);
  ensureDist(root, 'HEAD');

  // --- baseline: always fetch latest origin/master (not PR merge-base) ---
  const fetchRef = baseRemoteRef.startsWith('origin/')
    ? baseRemoteRef.slice('origin/'.length)
    : baseRef;
  console.log(`\n==> Fetching latest ${fetchRef} from origin\n`);
  run('git', ['fetch', '--no-tags', '--depth=1', 'origin', fetchRef]);

  const baseSha = runCapture('git', ['rev-parse', baseRemoteRef]);
  const headSha = runCapture('git', ['rev-parse', 'HEAD']);
  const outRoot = mkdtempSync(join(tmpdir(), 'claim-bench-'));
  const worktree = join(outRoot, 'base-wt');

  console.log(`\n==> Baseline worktree origin/master@${baseSha.slice(0, 7)} at ${worktree}\n`);
  run('git', ['worktree', 'add', '--detach', worktree, baseSha]);
  try {
    // Always npm ci in the baseline worktree. Symlinking tip node_modules alone
    // misses package-local installs (e.g. svelte2tsx under graphql-tag-pluck).
    console.log('\n==> Installing and building baseline worktree (npm ci + build)\n');
    run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: worktree });
    run('npm', ['run', 'build'], { cwd: worktree });
    ensureDist(worktree, 'baseline');
  } catch (error) {
    try {
      run('git', ['worktree', 'remove', '--force', worktree]);
    } catch {
      // ignore
    }
    throw error;
  }

  /** @type {Array<Record<string, unknown>>} */
  const claimRows = [];
  /** @type {Array<Record<string, unknown>>} */
  const syncApiRows = [];
  /** @type {Record<string, unknown> | null} */
  let httpPayload = null;

  function measureThreeWay({ bench, api }) {
    const masterSamples = [];
    const tipClassicSamples = [];
    const tipPlannedSamples = [];
    for (let i = 0; i < samples; i++) {
      masterSamples.push(measureHz({ packageRoot: worktree, bench, planning: false, api }));
      tipClassicSamples.push(measureHz({ packageRoot: root, bench, planning: false, api }));
      tipPlannedSamples.push(measureHz({ packageRoot: root, bench, planning: true, api }));
    }
    const masterHz = mean(masterSamples);
    const tipClassicHz = mean(tipClassicSamples);
    const tipPlannedHz = mean(tipPlannedSamples);
    return {
      masterHz,
      tipClassicHz,
      tipPlannedHz,
      deltaClassicVsMasterPct: (tipClassicHz / masterHz - 1) * 100,
      deltaPlannedVsMasterPct: (tipPlannedHz / masterHz - 1) * 100,
      deltaClassicVsPlannedPct: (tipClassicHz / tipPlannedHz - 1) * 100,
    };
  }

  function threeWayTableRow(label, row, extraCols = '') {
    return `| ${label} | ${Math.round(row.masterHz).toLocaleString('en-US')} | ${Math.round(row.tipClassicHz).toLocaleString('en-US')} | ${Math.round(row.tipPlannedHz).toLocaleString('en-US')} | ${pct(row.deltaClassicVsMasterPct)} | ${pct(row.deltaPlannedVsMasterPct)} | ${pct(row.deltaClassicVsPlannedPct)}${extraCols} |`;
  }

  try {
    for (const [id, meta] of Object.entries(EXECUTE_CASES)) {
      const row = measureThreeWay({ bench: id, api: 'execute' });
      claimRows.push({
        id,
        label: meta.label,
        kind: 'execute',
        api: 'execute',
        ...row,
      });
      console.log(
        `${meta.label}: master=${Math.round(row.masterHz)} classic=${Math.round(row.tipClassicHz)} planned=${Math.round(row.tipPlannedHz)} Δc/m=${pct(row.deltaClassicVsMasterPct)} Δp/m=${pct(row.deltaPlannedVsMasterPct)} Δc/p=${pct(row.deltaClassicVsPlannedPct)}`,
      );
    }

    for (const syncCase of SYNC_API_CASES) {
      const row = measureThreeWay({ bench: syncCase.bench, api: 'executeSync' });
      syncApiRows.push({
        id: syncCase.id,
        label: syncCase.label,
        kind: 'syncApi',
        api: 'executeSync',
        ...row,
      });
      console.log(
        `${syncCase.label}: master=${Math.round(row.masterHz)} classic=${Math.round(row.tipClassicHz)} planned=${Math.round(row.tipPlannedHz)} Δc/m=${pct(row.deltaClassicVsMasterPct)} Δp/m=${pct(row.deltaPlannedVsMasterPct)} Δc/p=${pct(row.deltaClassicVsPlannedPct)}`,
      );
    }

    if (!skipHttp) {
      console.log('\n==> Yoga authors + Hive federation-example HTTP benches\n');
      mkdirSync(resultsDir, { recursive: true });
      const httpJson = join(resultsDir, 'bench-matrix-http.json');
      run(process.execPath, [join(root, 'scripts/bench-matrix-http-ci.mjs')], {
        env: {
          ...process.env,
          BENCH_MATRIX_TIP_ROOT: root,
          BENCH_MATRIX_MASTER_ROOT: worktree,
          BENCH_MATRIX_WARM_MS: String(warmMs),
          BENCH_MATRIX_MEASURE_MS: String(measureMs),
          BENCH_MATRIX_HTTP_SAMPLES: String(httpSamples),
          BENCH_MATRIX_OUT_JSON: httpJson,
        },
        stdio: 'inherit',
      });
      httpPayload = JSON.parse(readFileSync(httpJson, 'utf8'));
      // Normalize HTTP rows to the same three-delta fields.
      for (const key of ['yoga', 'hive']) {
        const row = httpPayload?.[key];
        if (row && row.tipClassicHz != null && row.tipPlannedHz != null && row.masterHz != null) {
          row.deltaClassicVsMasterPct = (row.tipClassicHz / row.masterHz - 1) * 100;
          row.deltaPlannedVsMasterPct = (row.tipPlannedHz / row.masterHz - 1) * 100;
          row.deltaClassicVsPlannedPct = (row.tipClassicHz / row.tipPlannedHz - 1) * 100;
        }
      }
    }
  } finally {
    try {
      run('git', ['worktree', 'remove', '--force', worktree]);
    } catch {
      // ignore
    }
    rmSync(outRoot, { recursive: true, force: true });
  }

  const payload = {
    tip: headSha,
    baseline: baseSha,
    baselineRef: baseRemoteRef,
    measuredAt: new Date().toISOString(),
    warmMs,
    measureMs,
    samples,
    httpSamples,
    execute: claimRows,
    syncApi: syncApiRows,
    yoga: httpPayload?.yoga ?? null,
    hive: httpPayload?.hive ?? null,
    hiveNote: httpPayload?.hiveNote ?? null,
  };

  writeFileSync(RESULTS_JSON, `${JSON.stringify(payload, null, 2)}\n`);

  const threeWayHeader = [
    '| Bench | Master hz | Tip classic hz | Tip planned hz | Δ classic vs master | Δ planned vs master | Δ classic vs planned |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  const md = [
    MARKER,
    '## Bench matrix vs origin/master (process-isolated)',
    '',
    `HEAD \`${headSha.slice(0, 9)}\` vs \`${baseRemoteRef}\` (\`${baseSha.slice(0, 9)}\` fetched this run), Node ${process.version}, compiled dist.`,
    '',
    'Each row is a three-way: **tip classic** (`setExecutionPlanningEnabled(false)`) vs origin/master, **tip planned** vs that master, and **tip classic vs tip planned**.',
    '',
    '### execute',
    '',
    ...threeWayHeader,
    ...claimRows.map(row => threeWayTableRow(row.label, row)),
    '',
    '### executeSync',
    '',
    ...threeWayHeader,
    ...syncApiRows.map(row => threeWayTableRow(row.label, row)),
    '',
  ];

  if (!skipHttp) {
    const yoga = httpPayload?.yoga;
    const hive = httpPayload?.hive;
    const hiveNote = httpPayload?.hiveNote;
    md.push(
      '### Yoga authors HTTP',
      '',
      'Yoga benchmark schema + `authors` query (`graphql-yoga/benchmark`), `setExecuteFn` → tip/master `@graphql-tools/executor` dist.',
      '',
      ...threeWayHeader,
      ...(yoga ? [threeWayTableRow('Yoga authors', yoga)] : []),
      '',
    );
    md.push('### Hive Gateway federation-example', '');
    if (hiveNote) {
      md.push(`_${hiveNote}_`, '');
    }
    if (hive) {
      md.push(...threeWayHeader, threeWayTableRow('federation-example TestQuery', hive), '');
    }
  }

  writeFileSync(RESULTS_MD, `${md.join('\n')}\n`);
  console.log(`\nWrote ${RESULTS_JSON} and ${RESULTS_MD}\n`);
} catch (error) {
  writeFailureArtifact(error);
  throw error;
}
