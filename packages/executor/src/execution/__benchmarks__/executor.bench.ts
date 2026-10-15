/**
 * Executor microbenchmarks modeled on graphql-js list / object / repeated-field cases.
 * Requires a prior `npm run build`. Run with: npm run test:bench
 */
import { buildSchema, parse } from 'graphql';
import { test } from 'vitest';
import { execute as executeImported } from '@graphql-tools/executor';

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

test('executor benchmarks', async ({ bench }) => {
  await bench('Execute Synchronous List Field', () => {
    const result = execute({
      schema: listSchema,
      document: listDocument,
      rootValue: { listField: syncListField },
    });
    if (result instanceof Promise) {
      throw new Error('expected sync result');
    }
    return result.data;
  }).run();

  await bench('Execute Asynchronous List Field', async () => {
    const result = await execute({
      schema: listSchema,
      document: listDocument,
      rootValue: { listField: asyncListField },
    });
    return result.data;
  }).run();

  await bench('Execute Asynchronous Object Fields', async () => {
    const result = await execute({
      schema: objectSchema,
      document: objectDocument,
      rootValue: asyncObjectRootValue,
    });
    return result.data;
  }).run();

  await bench('Many repeated fields', () => {
    const result = execute({
      schema: repeatedSchema,
      document: repeatedDocument,
      rootValue: { hello: 'world' },
    });
    if (result instanceof Promise) {
      throw new Error('expected sync result');
    }
    return result.data;
  }).run();
});
