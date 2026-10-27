/**
 * Executor microbenchmarks modeled on graphql-js list / object / repeated-field cases.
 * Requires a prior `npm run build`. Run with: npm run test:bench
 */
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

const scalarListSchema = buildSchema('type Query { values: [Float!]! }', { assumeValid: true });
const scalarListDocument = parse('{ values }');
const scalarListRootValue = {
  values: Array.from({ length: 2_000_000 }, (_, index) => index * 1.25),
};

test('executor benchmarks', async ({ bench }) => {
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
