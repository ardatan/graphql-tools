#!/usr/bin/env node
/**
 * Compare Tinybench writeResult JSON folders (baseline vs current).
 * Emits GitHub Actions warnings / job summary on regressions; exits 0 by default
 * (warn-only). Set BENCH_FAIL_ON_REGRESSION=1 to fail the process.
 *
 * Usage: node scripts/compare-bench-results.mjs <baselineDir> <currentDir>
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const REGRESSION_RATIO = Number(process.env.BENCH_REGRESSION_THRESHOLD || '0.10');
const failOnRegression = process.env.BENCH_FAIL_ON_REGRESSION === '1';

const baselineDir = process.argv[2];
const currentDir = process.argv[3];

if (!baselineDir || !currentDir) {
  console.error('Usage: node scripts/compare-bench-results.mjs <baselineDir> <currentDir>');
  process.exit(2);
}

if (!existsSync(baselineDir) || !existsSync(currentDir)) {
  console.error(`Missing results directory (baseline=${baselineDir}, current=${currentDir})`);
  process.exit(2);
}

function loadResults(dir) {
  /** @type {Map<string, { throughput: number, latency: number }>} */
  const map = new Map();
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const throughput = raw?.throughput?.mean;
    const latency = raw?.latency?.mean;
    if (typeof throughput !== 'number' || typeof latency !== 'number') {
      console.warn(`Skipping malformed result: ${file}`);
      continue;
    }
    map.set(basename(file, '.json'), { throughput, latency });
  }
  return map;
}

const baseline = loadResults(baselineDir);
const current = loadResults(currentDir);

if (baseline.size === 0) {
  console.warn('No baseline benchmark results to compare.');
  process.exit(0);
}

/** @type {Array<{ name: string, baselineHz: number, currentHz: number, delta: number }>} */
const rows = [];
/** @type {typeof rows} */
const regressions = [];

for (const [name, base] of baseline) {
  const cur = current.get(name);
  if (!cur) {
    console.warn(`::warning::Benchmark missing in current run: ${name}`);
    continue;
  }
  const delta = (cur.throughput - base.throughput) / base.throughput;
  const row = {
    name,
    baselineHz: base.throughput,
    currentHz: cur.throughput,
    delta,
  };
  rows.push(row);
  if (delta < -REGRESSION_RATIO) {
    regressions.push(row);
  }
}

rows.sort((a, b) => a.delta - b.delta);

function pct(n) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function hz(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const lines = [
  '### Benchmark comparison vs base',
  '',
  `Regression threshold: **${(REGRESSION_RATIO * 100).toFixed(0)}%** slower throughput (warn-only${failOnRegression ? '; fail enabled' : ''}).`,
  '',
  '| Benchmark | Base hz | Current hz | Δ |',
  '| --- | ---: | ---: | ---: |',
  ...rows.map(
    row =>
      `| \`${row.name}\` | ${hz(row.baselineHz)} | ${hz(row.currentHz)} | ${pct(row.delta)}${
        row.delta < -REGRESSION_RATIO ? ' ⚠️' : ''
      } |`,
  ),
  '',
];

if (regressions.length === 0) {
  lines.push('No throughput regressions above the threshold.');
} else {
  lines.push(`**${regressions.length}** potential regression(s):`);
  for (const row of regressions) {
    const message = `Benchmark regression: ${row.name} is ${pct(row.delta)} vs base (${hz(row.baselineHz)} → ${hz(row.currentHz)} hz)`;
    console.warn(`::warning title=Benchmark regression::${message}`);
    lines.push(`- \`${row.name}\`: ${pct(row.delta)}`);
  }
}

const summary = lines.join('\n');
console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

if (failOnRegression && regressions.length > 0) {
  process.exit(1);
}
