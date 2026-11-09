#!/usr/bin/env node
/**
 * CI entrypoint: build HEAD and the PR base (master) packages, then run the
 * Vitest bench suite in interleaved rounds (H-M / M-H / …) so cold-start /
 * CPU-warmup order does not systematically bias one side. Average throughput
 * across rounds and compare with warn-only regression reporting.
 *
 * Env:
 *   GITHUB_BASE_REF / BENCH_BASE_REF  — base branch (default master)
 *   BENCH_ROUNDS                      — interleaved pairs (default 3)
 *   BENCH_REGRESSION_THRESHOLD        — forwarded to compare script
 *   BENCH_FAIL_ON_REGRESSION          — forwarded to compare script
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseRef = process.env.GITHUB_BASE_REF || process.env.BENCH_BASE_REF || 'master';
const baseRemoteRef = baseRef.startsWith('origin/') ? baseRef : `origin/${baseRef}`;
const rounds = Math.max(1, Number(process.env.BENCH_ROUNDS || '3') || 3);

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

function ensureResultsDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function writeBenches({ packageRoot, resultsDir, label }) {
  console.log(`\n==> Benchmarking ${label} (BENCH_PACKAGE_ROOT=${packageRoot || root})\n`);
  ensureResultsDir(resultsDir);
  // Vitest writeResult paths are relative to config root; stage into repo results then copy.
  const repoResults = join(root, 'benchmarks/results');
  ensureResultsDir(repoResults);
  run('npx', ['vitest', 'bench', '--run', '--reporter=verbose'], {
    env: {
      ...process.env,
      BENCH_WRITE: '1',
      // Always set so HEAD and base resolve packages the same way (absolute root vs worktree).
      BENCH_PACKAGE_ROOT: packageRoot || root,
    },
  });
  cpSync(repoResults, resultsDir, { recursive: true });
}

/**
 * Average Tinybench writeResult JSON folders into outDir.
 * Only throughput.mean / latency.mean are averaged (what compare uses); the
 * rest of the template is taken from the first round for shape compatibility.
 */
function averageResultDirs(dirs, outDir) {
  ensureResultsDir(outDir);
  /** @type {Map<string, { throughputs: number[], latencies: number[], template: Record<string, unknown> }>} */
  const acc = new Map();

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      throw new Error(`Missing round results dir: ${dir}`);
    }
    for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      const throughput = raw?.throughput?.mean;
      const latency = raw?.latency?.mean;
      if (typeof throughput !== 'number' || typeof latency !== 'number') {
        console.warn(`Skipping malformed result while averaging: ${join(dir, file)}`);
        continue;
      }
      let entry = acc.get(file);
      if (!entry) {
        entry = { throughputs: [], latencies: [], template: raw };
        acc.set(file, entry);
      }
      entry.throughputs.push(throughput);
      entry.latencies.push(latency);
    }
  }

  for (const [file, entry] of acc) {
    const n = entry.throughputs.length;
    const avgThroughput = entry.throughputs.reduce((a, b) => a + b, 0) / n;
    const avgLatency = entry.latencies.reduce((a, b) => a + b, 0) / n;
    const out = structuredClone(entry.template);
    if (out.throughput && typeof out.throughput === 'object') {
      out.throughput.mean = avgThroughput;
    }
    if (out.latency && typeof out.latency === 'object') {
      out.latency.mean = avgLatency;
    }
    out.rounds = n;
    out.roundThroughputs = entry.throughputs;
    out.roundLatencies = entry.latencies;
    writeFileSync(join(outDir, file), `${JSON.stringify(out, null, 2)}\n`);
  }

  console.log(`Averaged ${acc.size} benchmark(s) across ${dirs.length} round(s) → ${outDir}`);
}

// Fetch base for PRs / local compares.
try {
  run('git', ['fetch', '--no-tags', '--depth=1', 'origin', baseRef]);
} catch (error) {
  console.warn(`Could not fetch ${baseRef}: ${error.message}`);
}

console.log('\n==> Installing and building current checkout\n');
run('npm', ['run', 'build']);

const outRoot = mkdtempSync(join(tmpdir(), 'graphql-tools-bench-'));
const headResults = join(outRoot, 'head');
const baseResults = join(outRoot, 'base');

let baseSha = '';
try {
  baseSha = runCapture('git', ['rev-parse', baseRemoteRef]);
} catch {
  console.warn(`::warning::Skipping baseline compare; ${baseRemoteRef} is unavailable.`);
  // Still produce a single HEAD run for artifacts.
  writeBenches({ packageRoot: root, resultsDir: headResults, label: 'HEAD' });
  process.exit(0);
}

const headSha = runCapture('git', ['rev-parse', 'HEAD']);
if (baseSha === headSha) {
  console.log('HEAD matches base; skipping baseline compare.');
  writeBenches({ packageRoot: root, resultsDir: headResults, label: 'HEAD' });
  writeFileSync(join(outRoot, 'note.txt'), 'HEAD matches base — comparison skipped.\n');
  process.exit(0);
}

const worktree = join(outRoot, 'base-wt');
rmSync(worktree, { recursive: true, force: true });
console.log(`\n==> Creating base worktree at ${baseSha}\n`);
run('git', ['worktree', 'add', '--detach', worktree, baseSha]);

const headRoundDirs = [];
const baseRoundDirs = [];

try {
  console.log('\n==> Installing and building base worktree\n');
  run('npm', ['ci', '--no-audit', '--no-fund'], { cwd: worktree });
  run('npm', ['run', 'build'], { cwd: worktree });

  // Sanity-check the packages we bench exist on base.
  for (const pkg of ['executor', 'utils', 'load-files']) {
    const dist = join(worktree, 'packages', pkg, 'dist/esm/index.js');
    if (!existsSync(dist)) {
      throw new Error(`Base build missing ${dist}`);
    }
  }

  console.log(
    `\n==> Interleaved bench rounds: ${rounds} (order alternates HEAD/base each round)\n`,
  );

  for (let i = 0; i < rounds; i++) {
    const headDir = join(outRoot, `head-round-${i}`);
    const baseDir = join(outRoot, `base-round-${i}`);
    const headFirst = i % 2 === 0;
    const headLabel = `HEAD round ${i + 1}/${rounds}`;
    const baseLabel = `base ${baseSha.slice(0, 7)} round ${i + 1}/${rounds}`;

    if (headFirst) {
      writeBenches({ packageRoot: root, resultsDir: headDir, label: headLabel });
      writeBenches({ packageRoot: worktree, resultsDir: baseDir, label: baseLabel });
    } else {
      writeBenches({ packageRoot: worktree, resultsDir: baseDir, label: baseLabel });
      writeBenches({ packageRoot: root, resultsDir: headDir, label: headLabel });
    }

    headRoundDirs.push(headDir);
    baseRoundDirs.push(baseDir);
  }

  averageResultDirs(headRoundDirs, headResults);
  averageResultDirs(baseRoundDirs, baseResults);
} catch (error) {
  console.warn(
    `::warning::Could not produce interleaved baseline (${error.message}). Skipping compare.`,
  );
  process.exit(0);
} finally {
  try {
    run('git', ['worktree', 'remove', '--force', worktree]);
  } catch {
    // ignore cleanup errors
  }
}

console.log(`\n==> Comparing HEAD vs base (${rounds} interleaved round average)\n`);
run('node', [join(root, 'scripts/compare-bench-results.mjs'), baseResults, headResults], {
  env: {
    ...process.env,
    BENCH_COMPARE_ROUNDS: String(rounds),
  },
});

// Keep averaged HEAD results (+ per-round dumps) for the upload-artifact step.
try {
  const repoResults = join(root, 'benchmarks/results');
  ensureResultsDir(repoResults);
  // averageResultDirs already succeeded; copy whatever HEAD averaged.
  cpSync(headResults, repoResults, { recursive: true });
  writeFileSync(
    join(repoResults, 'COMPARED_AGAINST'),
    `${baseRemoteRef} ${baseSha}\nrounds=${rounds} interleaved\n`,
  );
  const roundsOut = join(repoResults, 'rounds');
  mkdirSync(roundsOut, { recursive: true });
  for (const dir of [...headRoundDirs, ...baseRoundDirs]) {
    cpSync(dir, join(roundsOut, basename(dir)), { recursive: true });
  }
} catch {
  // non-fatal
}
