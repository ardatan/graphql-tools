#!/usr/bin/env node
/**
 * Upsert a sticky PR comment for claim-floor bench results.
 *
 * Looks for an existing issue comment containing the marker
 * `<!-- graphql-tools-claim-floors-v1 -->` and updates it; otherwise creates one.
 *
 * Tolerates a missing claim-floors.md (posts a stub so the sticky still updates).
 *
 * Env:
 *   GH_TOKEN                 — required (GitHub token with issues:write)
 *   GITHUB_REPOSITORY        — owner/repo (Actions sets this)
 *   GITHUB_EVENT_PATH        — PR event payload (or set CLAIM_BENCH_PR_NUMBER)
 *   CLAIM_BENCH_PR_NUMBER    — override PR number
 *   CLAIM_BENCH_MD_PATH      — markdown file (default benchmarks/results/claim-floors.md)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = '<!-- graphql-tools-claim-floors-v1 -->';
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

function readPrNumber() {
  if (process.env.CLAIM_BENCH_PR_NUMBER) {
    return Number(process.env.CLAIM_BENCH_PR_NUMBER);
  }
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const n = event?.pull_request?.number ?? event?.issue?.number;
    if (n) return Number(n);
  }
  throw new Error('Could not determine PR number (CLAIM_BENCH_PR_NUMBER / GITHUB_EVENT_PATH).');
}

const prNumber = readPrNumber();
const mdPath = resolve(
  root,
  process.env.CLAIM_BENCH_MD_PATH || 'benchmarks/results/claim-floors.md',
);

function loadBody() {
  if (existsSync(mdPath)) {
    const body = readFileSync(mdPath, 'utf8');
    if (body.includes(MARKER)) {
      return body;
    }
    return `${MARKER}\n${body}\n`;
  }
  const stub = [
    MARKER,
    '## Claim floors vs master (process-isolated)',
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
    if (!Array.isArray(comments) || comments.length === 0) {
      return null;
    }
    const hit = comments.find(c => typeof c.body === 'string' && c.body.includes(MARKER));
    if (hit) {
      return hit;
    }
    if (comments.length < 100) {
      return null;
    }
  }
  return null;
}

const existing = await findStickyComment();
if (existing) {
  await gh(`/repos/${owner}/${repoName}/issues/comments/${existing.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
  console.log(`Updated sticky claim-floors comment ${existing.id} on PR #${prNumber}`);
} else {
  const created = await gh(`/repos/${owner}/${repoName}/issues/${prNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  console.log(`Created sticky claim-floors comment ${created.id} on PR #${prNumber}`);
}
