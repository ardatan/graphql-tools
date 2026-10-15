#!/usr/bin/env node
/**
 * CI entrypoint: build+bench the PR (or current HEAD), then build master packages
 * in a worktree and re-run the same harness against that dist for a baseline.
 * Compare with warn-only regression reporting.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseRef = process.env.GITHUB_BASE_REF || process.env.BENCH_BASE_REF || 'master';
const baseRemoteRef = baseRef.startsWith('origin/') ? baseRef : `origin/${baseRef}`;

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
      ...(packageRoot ? { BENCH_PACKAGE_ROOT: packageRoot } : {}),
    },
  });
  cpSync(repoResults, resultsDir, { recursive: true });
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

writeBenches({ packageRoot: undefined, resultsDir: headResults, label: 'HEAD' });

let baseSha = '';
try {
  baseSha = runCapture('git', ['rev-parse', baseRemoteRef]);
} catch {
  console.warn(`::warning::Skipping baseline compare; ${baseRemoteRef} is unavailable.`);
  process.exit(0);
}

const headSha = runCapture('git', ['rev-parse', 'HEAD']);
if (baseSha === headSha) {
  console.log('HEAD matches base; skipping baseline compare.');
  writeFileSync(join(outRoot, 'note.txt'), 'HEAD matches base — comparison skipped.\n');
  process.exit(0);
}

const worktree = join(outRoot, 'base-wt');
rmSync(worktree, { recursive: true, force: true });
console.log(`\n==> Creating base worktree at ${baseSha}\n`);
run('git', ['worktree', 'add', '--detach', worktree, baseSha]);

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

  writeBenches({
    packageRoot: worktree,
    resultsDir: baseResults,
    label: `base ${baseSha.slice(0, 7)}`,
  });
} catch (error) {
  console.warn(
    `::warning::Could not produce base benchmark baseline (${error.message}). Skipping compare.`,
  );
  process.exit(0);
} finally {
  try {
    run('git', ['worktree', 'remove', '--force', worktree]);
  } catch {
    // ignore cleanup errors
  }
}

console.log('\n==> Comparing HEAD vs base\n');
run('node', [join(root, 'scripts/compare-bench-results.mjs'), baseResults, headResults]);

// Keep a tiny machine-local breadcrumb for debugging CI artifacts.
try {
  writeFileSync(join(root, 'benchmarks/results/COMPARED_AGAINST'), `${baseRemoteRef} ${baseSha}\n`);
  // Restore head results into the workspace for optional artifact upload.
  const listed = readFileSync(join(headResults, 'executor-sync-list.json'), 'utf8');
  if (listed) {
    cpSync(headResults, join(root, 'benchmarks/results'), { recursive: true });
  }
} catch {
  // non-fatal
}
