/**
 * Executor microbenchmarks modeled on graphql-js list / object / repeated-field cases.
 * Requires a prior `npm run build`. Run with: npm run test:bench
 */
import type { HeapProfiler } from 'node:inspector';
import { Session } from 'node:inspector/promises';
import { buildSchema, parse } from 'graphql';
import { test } from 'vitest';
import { execute as executeImported } from '@graphql-tools/executor';

function writeOpts(name: string): { writeResult: string } | Record<string, never> {
  return process.env['BENCH_WRITE'] ? { writeResult: `./benchmarks/results/${name}.json` } : {};
}

// Local binding avoids any remaining export-getter overhead on the hot path.
const execute = executeImported;

const listSchema = buildSchema('type Query { listField: [String] }', {
  assumeValid: true,
});
const listDocument = parse('{ listField }');

function syncListField() {
  const results: number[] = [];
  for (let index = 0; index < 1000; index++) {
    results.push(index);
  }
  return results;
}

function asyncListField() {
  const results: Promise<number>[] = [];
  for (let index = 0; index < 1000; index++) {
    results.push(Promise.resolve(index));
  }
  return results;
}

const fieldCount = 1000;
const fieldNames = Array.from({ length: fieldCount }, (_, index) => `f${index}`);
const objectSchema = buildSchema(
  `type Query { ${fieldNames.map(fieldName => `${fieldName}: Int`).join(' ')} }`,
  { assumeValid: true },
);
const objectDocument = parse(`{ ${fieldNames.join(' ')} }`);
const asyncObjectRootValue = Object.fromEntries(
  fieldNames.map((fieldName, index) => [fieldName, () => Promise.resolve(index)]),
);

const repeatedSchema = buildSchema('type Query { hello: String! }', {
  assumeValid: true,
});
const repeatedDocument = parse(`{ ${'hello '.repeat(250)}}`);

const matrixSchema = buildSchema('type Query { matrix: [[Float!]!]! }');
const matrixDocument = parse('{ matrix }');
const matrixCases = [2, 8, 16, 1000].map(width => ({
  width,
  rootValue: {
    matrix: Array.from({ length: Math.max(100, Math.floor(20_000 / width)) }, (_, row) =>
      Array.from({ length: width }, (_, column) => row + column),
    ),
  },
}));

// Run this diagnostic separately from timings, in a fresh exposed-GC process:
// BENCH_LIST_STORAGE=1 npm run test:bench -- executor.bench.ts --execArgv=--expose-gc -t 'completed-list retained storage'
// BENCH_PACKAGE_ROOT can select a separately built baseline checkout as in CI.
// Add BENCH_LIST_ALLOCATIONS=1 for a separate allocation-sampling run, not timings or retention.
test.skipIf(process.env['BENCH_LIST_STORAGE'] !== '1')(
  'completed-list retained storage',
  async () => {
    if (!global.gc) throw new Error('The storage diagnostic requires --expose-gc');
    const rootValue = {
      matrix: Array.from({ length: 500_000 }, (_, index) => [index, index % 97]),
    };
    const retainedValues: { input: unknown; output: unknown } = {
      input: rootValue,
      output: undefined,
    };
    const lifetimeKey = Symbol('completed-list storage lifetime');
    Object.defineProperty(globalThis, lifetimeKey, { value: retainedValues, configurable: true });
    try {
      global.gc();
      global.gc();
      const inputReadyHeap = process.memoryUsage().heapUsed;
      const session = process.env['BENCH_LIST_ALLOCATIONS'] === '1' ? new Session() : undefined;
      if (session) {
        session.connect();
        await session.post('HeapProfiler.startSampling', {
          samplingInterval: 16_384,
          includeObjectsCollectedByMajorGC: true,
          includeObjectsCollectedByMinorGC: true,
        });
      }
      const result = execute({ schema: matrixSchema, document: matrixDocument, rootValue });
      retainedValues.output = result;
      if (result instanceof Promise || !('data' in result) || result.errors) {
        throw new Error('Expected a successful synchronous matrix result');
      }
      const afterExecuteHeap = process.memoryUsage().heapUsed;
      let sampledAllocationBytes: number | undefined;
      if (session) {
        try {
          const { profile } = await session.post('HeapProfiler.stopSampling');
          const total = (node: HeapProfiler.SamplingHeapProfileNode): number =>
            node.selfSize + node.children.reduce((sum, child) => sum + total(child), 0);
          sampledAllocationBytes = total(profile.head);
        } finally {
          session.disconnect();
        }
      }
      global.gc();
      global.gc();
      const retainedOutputBytes = process.memoryUsage().heapUsed - inputReadyHeap;
      // Both roots stay strongly reachable until after the final heap read. The
      // input is already in the baseline and must not be collected from the delta.
      console.info({
        inputReadyHeap,
        afterExecuteHeap,
        retainedOutputBytes: session ? undefined : retainedOutputBytes,
        sampledAllocationBytes,
        maxRssKiB: process.resourceUsage().maxRSS,
        serializedBytes: JSON.stringify(result).length,
      });
    } finally {
      Reflect.deleteProperty(globalThis, lifetimeKey);
    }
  },
);
const scalarListSchema = buildSchema('type Query { values: [Float!]! }', { assumeValid: true });
const scalarListDocument = parse('{ values }');
const scalarListRootValue = {
  values: Array.from({ length: 2_000_000 }, (_, index) => index * 1.25),
};

test('executor benchmarks', async ({ bench }) => {
  for (const { width, rootValue } of matrixCases) {
    await bench(
      `Execute Synchronous Matrix (width ${width})`,
      { ...writeOpts(`executor-sync-matrix-${width}`) },
      () => {
        const result = execute({ schema: matrixSchema, document: matrixDocument, rootValue });
        if (result instanceof Promise) throw new Error('expected sync result');
        return 'data' in result ? result.data : result;
      },
    ).run();
  }
  await bench('Execute Synchronous List Field', { ...writeOpts('executor-sync-list') }, () => {
    const result = execute({
      schema: listSchema,
      document: listDocument,
      rootValue: { listField: syncListField },
    });
    if (result instanceof Promise) {
      throw new Error('expected sync result');
    }
    return 'data' in result ? result.data : result;
  }).run();

  await bench(
    'Execute Asynchronous List Field',
    { ...writeOpts('executor-async-list') },
    async () => {
      const result = await execute({
        schema: listSchema,
        document: listDocument,
        rootValue: { listField: asyncListField },
      });
      return 'data' in result ? result.data : result;
    },
  ).run();

  await bench(
    'Execute Asynchronous Object Fields',
    { ...writeOpts('executor-async-object') },
    async () => {
      const result = await execute({
        schema: objectSchema,
        document: objectDocument,
        rootValue: asyncObjectRootValue,
      });
      return 'data' in result ? result.data : result;
    },
  ).run();

  await bench('Many repeated fields', { ...writeOpts('executor-repeated-fields') }, () => {
    const result = execute({
      schema: repeatedSchema,
      document: repeatedDocument,
      rootValue: { hello: 'world' },
    });
    if (result instanceof Promise) {
      throw new Error('expected sync result');
    }
    return 'data' in result ? result.data : result;
  }).run();
});

test('scalar list completion benchmarks', async ({ bench }) => {
  await bench(
    'Execute Dense Synchronous Float List',
    { ...writeOpts('executor-sync-float-list') },
    () => {
      const result = execute({
        schema: scalarListSchema,
        document: scalarListDocument,
        rootValue: scalarListRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();
});

const nestedItemCount = 200;
const nestedSchema = buildSchema(
  /* GraphQL */ `
    type Friend {
      name: String
    }
    type Item {
      name: String
      friend: Friend
    }
    type Query {
      items: [Item]
      a: String
      b: String
    }
  `,
  { assumeValid: true },
);
const nestedItems = Array.from({ length: nestedItemCount }, (_, index) => ({
  name: `item-${index}`,
  friend: { name: `friend-${index}` },
}));
const nestedRootValue = {
  items: nestedItems,
  a: 'a',
  b: 'b',
};
const stableDocument = parse(/* GraphQL */ `
  query ($unused: String) {
    items {
      name
      friend {
        name
      }
    }
  }
`);
const skipDocument = parse(/* GraphQL */ `
  query ($s: Boolean!) {
    a
    b @skip(if: $s)
    items {
      name
    }
  }
`);

test('collectFields cache benchmarks', async ({ bench }) => {
  let unusedCounter = 0;
  await bench(
    'Repeated execute shared document (unused variables)',
    { ...writeOpts('executor-collect-fields-stable') },
    () => {
      for (let index = 0; index < 25; index++) {
        const result = execute({
          schema: nestedSchema,
          document: stableDocument,
          rootValue: nestedRootValue,
          variableValues: { unused: String(unusedCounter++) },
        });
        if (result instanceof Promise) {
          throw new Error('expected sync result');
        }
      }
    },
  ).run();

  let skipToggle = false;
  await bench(
    'Repeated execute shared document (@skip variable)',
    { ...writeOpts('executor-collect-fields-skip-var') },
    () => {
      for (let index = 0; index < 25; index++) {
        skipToggle = !skipToggle;
        const result = execute({
          schema: nestedSchema,
          document: skipDocument,
          rootValue: nestedRootValue,
          variableValues: { s: skipToggle },
        });
        if (result instanceof Promise) {
          throw new Error('expected sync result');
        }
      }
    },
  ).run();
});
