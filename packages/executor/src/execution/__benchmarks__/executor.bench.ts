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

const propertyBagWidth = 400;
const propertyBagNames = Array.from({ length: propertyBagWidth }, (_, index) => `p${index}`);
const propertyBagSchema = buildSchema(
  `type Query { ${propertyBagNames.map(name => `${name}: Int`).join(' ')} }`,
  { assumeValid: true },
);
const propertyBagDocument = parse(`{ ${propertyBagNames.join(' ')} }`);
const propertyBagRootValue = Object.fromEntries(
  propertyBagNames.map((name, index) => [name, index]),
);

const nestedDefaultDocument = parse(/* GraphQL */ `
  {
    items {
      name
      friend {
        name
      }
    }
  }
`);

test('default resolver property fast path benchmarks', async ({ bench }) => {
  await bench(
    `Property-bag ${propertyBagWidth} Int fields (default resolver)`,
    { ...writeOpts('executor-default-resolver-property-bag') },
    () => {
      const result = execute({
        schema: propertyBagSchema,
        document: propertyBagDocument,
        rootValue: propertyBagRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();

  // Same nested shape as collect-fields-stable, but a single execute so CI can
  // attribute default-resolver leaf work separately from the 25x shared-doc loop.
  await bench(
    `Nested default-resolver objects (${nestedItemCount} items)`,
    { ...writeOpts('executor-default-resolver-nested-objects') },
    () => {
      const result = execute({
        schema: nestedSchema,
        document: nestedDefaultDocument,
        rootValue: nestedRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();
});

/**
 * Execution plan warm vs cold: cold clears the plan cache every iteration so
 * compile + execute are measured; warm compiles once then repeatedly executes
 * on the warm plan path.
 *
 * Skips when BENCH_PACKAGE_ROOT points at a build without the plan API (e.g.
 * master baseline in CI) so interleaved compare still runs other benches.
 */
test('execution plan warm path benchmarks', async ({ bench }) => {
  const executor = await import('@graphql-tools/executor');
  const clearExecutionPlanCache = executor.clearExecutionPlanCache as
    ((document?: object) => void) | undefined;
  const compileExecutionPlan = executor.compileExecutionPlan as
    ((args: object) => unknown) | undefined;

  if (typeof clearExecutionPlanCache !== 'function' || typeof compileExecutionPlan !== 'function') {
    console.warn('execution plan API unavailable in this build; skipping plan warm/cold benches');
    return;
  }

  await bench(
    'Plan cold: compile+execute nested objects each iter',
    { ...writeOpts('executor-plan-cold-nested') },
    () => {
      clearExecutionPlanCache(nestedDefaultDocument);
      const result = execute({
        schema: nestedSchema,
        document: nestedDefaultDocument,
        rootValue: nestedRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();

  compileExecutionPlan({
    schema: nestedSchema,
    document: nestedDefaultDocument,
  });
  await bench(
    'Plan warm: execute nested objects (cached plan)',
    { ...writeOpts('executor-plan-warm-nested') },
    () => {
      const result = execute({
        schema: nestedSchema,
        document: nestedDefaultDocument,
        rootValue: nestedRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();

  await bench(
    'Plan cold: compile+execute property-bag each iter',
    { ...writeOpts('executor-plan-cold-property-bag') },
    () => {
      clearExecutionPlanCache(propertyBagDocument);
      const result = execute({
        schema: propertyBagSchema,
        document: propertyBagDocument,
        rootValue: propertyBagRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();

  compileExecutionPlan({
    schema: propertyBagSchema,
    document: propertyBagDocument,
  });
  await bench(
    'Plan warm: execute property-bag (cached plan)',
    { ...writeOpts('executor-plan-warm-property-bag') },
    () => {
      const result = execute({
        schema: propertyBagSchema,
        document: propertyBagDocument,
        rootValue: propertyBagRootValue,
      });
      if (result instanceof Promise) {
        throw new Error('expected sync result');
      }
      return 'data' in result ? result.data : result;
    },
  ).run();
});

// Dense field-level @skip/@include — plan-path predicate filter keep bench.
const denseSkipSchema = buildSchema(
  /* GraphQL */ `
    type Query {
      ${Array.from({ length: 40 }, (_, i) => `f${i}: Int`).join('\n')}
    }
  `,
  { assumeValid: true },
);
const denseSkipDocument = parse(/* GraphQL */ `
  query ($s: Boolean!, $i: Boolean!) {
    f0
    f1 @skip(if: $s)
    f2 @include(if: $i)
    f3 @skip(if: $s) @include(if: $i)
    f4
    f5 @skip(if: $s)
    f6 @include(if: $i)
    f7
    f8 @skip(if: $s)
    f9 @include(if: $i)
    f10
    f11 @skip(if: $s)
    f12 @include(if: $i)
    f13
    f14 @skip(if: $s)
    f15 @include(if: $i)
    f16
    f17 @skip(if: $s)
    f18 @include(if: $i)
    f19
    f20 @skip(if: $s)
    f21 @include(if: $i)
    f22
    f23 @skip(if: $s)
    f24 @include(if: $i)
    f25
    f26 @skip(if: $s)
    f27 @include(if: $i)
    f28
    f29 @skip(if: $s)
    f30 @include(if: $i)
    f31
    f32 @skip(if: $s)
    f33 @include(if: $i)
    f34
    f35 @skip(if: $s)
    f36 @include(if: $i)
    f37
    f38 @skip(if: $s)
    f39 @include(if: $i)
  }
`);
const denseSkipRootValue = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`f${i}`, i]));
let denseSkipToggle = false;

test('skip/include predicate candidate benchmarks', async ({ bench }) => {
  await bench(
    'Dense @skip/@include variable fields',
    { ...writeOpts('executor-dense-skip-include') },
    () => {
      for (let index = 0; index < 25; index++) {
        denseSkipToggle = !denseSkipToggle;
        const result = execute({
          schema: denseSkipSchema,
          document: denseSkipDocument,
          rootValue: denseSkipRootValue,
          variableValues: { s: denseSkipToggle, i: !denseSkipToggle },
        });
        if (result instanceof Promise) {
          throw new Error('expected sync result');
        }
      }
    },
  ).run();
});
