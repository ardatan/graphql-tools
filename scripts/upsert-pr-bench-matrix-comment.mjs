#!/usr/bin/env node
/**
 * Upsert a sticky PR comment for the process-isolated bench matrix.
 *
 * Looks for an existing issue comment containing
 * `<!-- graphql-tools-bench-matrix-v1 -->` (or the legacy claim-floors marker)
 * and updates it; otherwise creates one.
 *
 * Tolerates a missing bench-matrix.md (posts a stub so the sticky still updates).
 *
 * Env:
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 *   GITHUB_EVENT_PATH / BENCH_MATRIX_PR_NUMBER (CLAIM_BENCH_PR_NUMBER alias)
 *   BENCH_MATRIX_MD_PATH (default benchmarks/results/bench-matrix.md)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = '<!-- graphql-tools-bench-matrix-v1 -->';
const LEGACY_MARKER = '<!-- graphql-tools-claim-floors-v1 -->';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GH_TOKEN (or GITHUB_TOKEN) is required to upsert the PR comment.');
  process.exit(2);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !repo.includes('/')) {
  console.error('GITHUB_REPOSITORY must be set (owner/repo).');
  process.exit(2);
}
const [owner, repoName] = repo.split('/');

function env(name, fallback = undefined) {
  const alias = name.replace(/^BENCH_MATRIX_/, 'CLAIM_BENCH_');
  return process.env[name] ?? process.env[alias] ?? fallback;
}

function readPrNumber() {
  if (env('BENCH_MATRIX_PR_NUMBER')) {
    return Number(env('BENCH_MATRIX_PR_NUMBER'));
  }
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const n = event?.pull_request?.number ?? event?.issue?.number;
    if (n) return Number(n);
  }
  throw new Error('Could not determine PR number (BENCH_MATRIX_PR_NUMBER / GITHUB_EVENT_PATH).');
}

const prNumber = readPrNumber();
const mdPath = resolve(root, env('BENCH_MATRIX_MD_PATH', 'benchmarks/results/bench-matrix.md'));

function loadBody() {
  if (existsSync(mdPath)) {
    const body = readFileSync(mdPath, 'utf8');
    if (body.includes(MARKER)) return body;
    if (body.includes(LEGACY_MARKER)) return body.replace(LEGACY_MARKER, MARKER);
    return `${MARKER}\n${body}\n`;
  }
  const stub = [
    MARKER,
    '## Bench matrix vs origin/master (process-isolated)',
    '',
    `_Bench harness did not produce \`${mdPath.replace(root + '/', '')}\` this run (build or measure failed before writing results)._`,
    '',
  ].join('\n');
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, `${stub}\n`);
  console.warn(`Missing ${mdPath}; wrote stub sticky body for upsert.`);
  return stub;
}

const body = loadBody();

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${init.method || 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return json;
}

async function findStickyComment() {
  for (let page = 1; page <= 20; page++) {
    const comments = await gh(
      `/repos/${owner}/${repoName}/issues/${prNumber}/comments?per_page=100&page=${page}`,
    );
    if (!Array.isArray(comments) || comments.length === 0) return null;
    const hit = comments.find(
      c =>
        typeof c.body === 'string' && (c.body.includes(MARKER) || c.body.includes(LEGACY_MARKER)),
    );
    if (hit) return hit;
    if (comments.length < 100) return null;
  }
  return null;
}

const existing = await findStickyComment();
if (existing) {
  await gh(`/repos/${owner}/${repoName}/issues/comments/${existing.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
  console.log(`Updated sticky bench-matrix comment ${existing.id} on PR #${prNumber}`);
} else {
  const created = await gh(`/repos/${owner}/${repoName}/issues/${prNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  console.log(`Created sticky bench-matrix comment ${created.id} on PR #${prNumber}`);
}
