/**
 * Process-isolated Yoga warm throughput: graphql-js execute vs @graphql-tools/executor.
 *
 * Usage:
 *   node scripts/measure-yoga-warm-throughput.mjs [packageRoot] [outJson] [label]
 *
 * Hive Gateway is not in this monorepo — see the internal note for blockers.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve as resolvePath } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const root = resolvePath(process.argv[2] ?? process.cwd());
const outPath = process.argv[3];
const label = process.argv[4] ?? 'local';
const require = createRequire(`${root}/package.json`);

const { createSchema, createYoga } = await import(
  pathToFileURL(require.resolve('graphql-yoga')).href
);
const { execute: toolsExecute } = await import(
  pathToFileURL(require.resolve('@graphql-tools/executor')).href
);
const { execute: graphqlExecute } = await import(pathToFileURL(require.resolve('graphql')).href);

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

const typeDefs = denseSkipSDL();
const resolvers = {
  Query: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, () => i])),
};
const schema = createSchema({ typeDefs, resolvers });
const body = JSON.stringify({
  query: denseSkipQuery(),
  variables: { s: false, i: true },
});

function makeYoga(executeFn) {
  return createYoga({
    schema,
    logging: false,
    graphqlEndpoint: '/graphql',
    plugins: [
      {
        onExecute({ setExecuteFn }) {
          setExecuteFn(args => executeFn(args));
        },
      },
    ],
  });
}

async function measureHz(yoga, warmupMs, measureMs) {
  const url = 'http://yoga/graphql';
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  };
  const tWarm = performance.now();
  while (performance.now() - tWarm < warmupMs) {
    const res = await yoga.fetch(url, init);
    await res.json();
  }
  let ops = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < measureMs) {
    const res = await yoga.fetch(url, init);
    const json = await res.json();
    if (json?.errors) {
      throw new Error(`yoga errors: ${JSON.stringify(json.errors)}`);
    }
    ops++;
  }
  const elapsed = performance.now() - t0;
  return { ops, elapsedMs: elapsed, hz: (ops / elapsed) * 1000 };
}

const WARMUP_MS = 400;
const MEASURE_MS = 1200;

const yogaGraphqlJs = makeYoga(graphqlExecute);
const yogaTools = makeYoga(toolsExecute);

const graphqlJs = await measureHz(yogaGraphqlJs, WARMUP_MS, MEASURE_MS);
const tools = await measureHz(yogaTools, WARMUP_MS, MEASURE_MS);

const report = {
  node: process.version,
  root,
  label,
  warmupMs: WARMUP_MS,
  measureMs: MEASURE_MS,
  bench: 'yoga-denseSkip-http-fetch',
  graphqlJsExecute: graphqlJs,
  graphqlToolsExecutor: tools,
  deltaPctVsGraphqlJs: ((tools.hz - graphqlJs.hz) / graphqlJs.hz) * 100,
  notes: [
    'Same Yoga server shape; only the Envelop execute fn differs.',
    'Tools side uses @graphql-tools/executor (planned warm path after first request).',
    'graphql-js side uses graphql.execute (no plan cache).',
    'Hive Gateway not packaged in this monorepo — not measured here.',
  ],
};

const json = JSON.stringify(report, null, 2);
console.log(json);
if (outPath) {
  writeFileSync(outPath, json);
}
