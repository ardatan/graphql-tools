/**
 * Isolate variable/input-object coerce cost for baseline vs hoisted coercers.
 * Warm plan: compile once (internal module), then only call plan.coerceVariables.
 *
 * Coerce-only cases need the internal plan module and only run against tip.
 * Coerce+execute cases always run (master vs tip compare).
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema, parse } from 'graphql';
import { test } from 'vitest';
import { execute as executeImported } from '@graphql-tools/executor';
import { compileExecutionPlan, isExecutionPlan } from '../plan.js';

function writeOpts(name: string): { writeResult: string } | Record<string, never> {
  return process.env['BENCH_WRITE'] ? { writeResult: `./benchmarks/results/${name}.json` } : {};
}

const execute = executeImported;

const tipRepoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../../');

function isTipPackage(): boolean {
  const root = process.env['BENCH_PACKAGE_ROOT'];
  return root == null || resolve(root) === tipRepoRoot;
}

const smallSchema = buildSchema(
  /* GraphQL */ `
    input NestedInput {
      x: Float!
      y: [Int!]!
    }
    input FilterInput {
      a: Int!
      b: String!
      nested: NestedInput!
    }
    type Query {
      search(filter: FilterInput!): String!
    }
  `,
  { assumeValid: true },
);
const smallDocument = parse(/* GraphQL */ `
  query ($filter: FilterInput!) {
    search(filter: $filter)
  }
`);
const smallRoot = {
  // Default field resolver calls root functions as (args, context, info).
  search: (args: { filter: { a: number; b: string; nested: { x: number; y: number[] } } }) =>
    `${args.filter.a}:${args.filter.b}:${args.filter.nested.x}:${args.filter.nested.y.length}`,
};

const heavySchema = buildSchema(
  /* GraphQL */ `
    input LeafBag {
      ${Array.from({ length: 40 }, (_, i) => `k${i}: Int!`).join('\n')}
    }
    input MidInput {
      name: String!
      tags: [String!]!
      bag: LeafBag!
    }
    input HeavyFilter {
      id: Int!
      mids: [MidInput!]!
    }
    type Query {
      search(filter: HeavyFilter!): Int!
    }
  `,
  { assumeValid: true },
);
const heavyDocument = parse(/* GraphQL */ `
  query ($filter: HeavyFilter!) {
    search(filter: $filter)
  }
`);
const heavyRoot = {
  search: (args: { filter: { id: number; mids: unknown[] } }) =>
    args.filter.id + args.filter.mids.length,
};

function makeSmallRaw(n: number) {
  return {
    filter: {
      a: n,
      b: `v${n}`,
      nested: { x: n * 1.5, y: [1, 2, n, n + 1, n + 2] },
    },
  };
}

function makeHeavyRaw(n: number) {
  const bag: Record<string, number> = {};
  for (let i = 0; i < 40; i++) {
    bag[`k${i}`] = n + i;
  }
  const mids = Array.from({ length: 25 }, (_, mi) => ({
    name: `m${n}-${mi}`,
    tags: [`t${mi}`, `u${mi}`, `v${mi}`],
    bag: { ...bag },
  }));
  return { filter: { id: n, mids } };
}

const defaultsSchema = buildSchema(
  /* GraphQL */ `
    input NestedInput {
      x: Float! = 1.5
      y: [Int!]! = [1, 2, 3]
    }
    input FilterInput {
      a: Int! = 7
      b: String! = "x"
      nested: NestedInput! = { x: 1.5, y: [1, 2, 3] }
    }
    type Query {
      search(filter: FilterInput!): String!
    }
  `,
  { assumeValid: true },
);
const defaultsDocument = parse(/* GraphQL */ `
  query ($filter: FilterInput! = { a: 7, b: "x", nested: { x: 1.5, y: [1, 2, 3] } }) {
    search(filter: $filter)
  }
`);

let smallCoerceN = 0;
let heavyCoerceN = 0;
let smallExecN = 0;
let heavyExecN = 0;
let defaultsCoerceN = 0;

test('coercer confidence (coerce-only + coerce+execute)', async ({ bench }) => {
  if (isTipPackage()) {
    const smallPlanResult = compileExecutionPlan({
      schema: smallSchema,
      document: smallDocument,
    });
    if (!isExecutionPlan(smallPlanResult)) {
      throw new Error('expected small execution plan');
    }
    const smallPlan = smallPlanResult;

    const defaultsPlanResult = compileExecutionPlan({
      schema: defaultsSchema,
      document: defaultsDocument,
    });
    if (!isExecutionPlan(defaultsPlanResult)) {
      throw new Error('expected defaults execution plan');
    }
    const defaultsPlan = defaultsPlanResult;

    const heavyPlanResult = compileExecutionPlan({
      schema: heavySchema,
      document: heavyDocument,
    });
    if (!isExecutionPlan(heavyPlanResult)) {
      throw new Error('expected heavy execution plan');
    }
    const heavyPlan = heavyPlanResult;

    await bench(
      'Coerce-only: small nested input-object (warm plan)',
      { ...writeOpts('coercer-only-small') },
      () => {
        for (let i = 0; i < 500; i++) {
          smallCoerceN++;
          const result = smallPlan.coerceVariables(makeSmallRaw(smallCoerceN));
          if ('errors' in result) {
            throw new Error('coerce failed');
          }
        }
      },
    ).run();

    await bench(
      'Coerce-only: omitted vars use AST defaults (warm plan)',
      { ...writeOpts('coercer-only-defaults') },
      () => {
        for (let i = 0; i < 500; i++) {
          defaultsCoerceN++;
          const result = defaultsPlan.coerceVariables({});
          if ('errors' in result) {
            throw new Error('coerce failed');
          }
        }
      },
    ).run();

    await bench(
      'Coerce-only: heavy nested input-object (warm plan)',
      { ...writeOpts('coercer-only-heavy') },
      () => {
        for (let i = 0; i < 50; i++) {
          heavyCoerceN++;
          const result = heavyPlan.coerceVariables(makeHeavyRaw(heavyCoerceN));
          if ('errors' in result) {
            throw new Error('coerce failed');
          }
        }
      },
    ).run();
  } else {
    console.warn('coerce-only plan benches skipped (not tip package)');
  }

  await bench(
    'Coerce+execute: small nested input-object',
    { ...writeOpts('coercer-exec-small') },
    () => {
      for (let i = 0; i < 50; i++) {
        smallExecN++;
        const result = execute({
          schema: smallSchema,
          document: smallDocument,
          rootValue: smallRoot,
          variableValues: makeSmallRaw(smallExecN),
        });
        if (result instanceof Promise) {
          throw new Error('expected sync result');
        }
        if (result.errors) {
          throw new Error('execution returned errors');
        }
      }
    },
  ).run();

  await bench(
    'Coerce+execute: heavy nested input-object',
    { ...writeOpts('coercer-exec-heavy') },
    () => {
      for (let i = 0; i < 10; i++) {
        heavyExecN++;
        const result = execute({
          schema: heavySchema,
          document: heavyDocument,
          rootValue: heavyRoot,
          variableValues: makeHeavyRaw(heavyExecN),
        });
        if (result instanceof Promise) {
          throw new Error('expected sync result');
        }
        if (result.errors) {
          throw new Error('execution returned errors');
        }
      }
    },
  ).run();
});
