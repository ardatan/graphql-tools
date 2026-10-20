import {
  DocumentNode,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import { type IncrementalSpec } from '@graphql-tools/utils';
import { expectJSON } from '../../__testUtils__/expectJSON.js';
import { resolveOnNextTick } from '../../__testUtils__/resolveOnNextTick.js';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from '../execute.js';
import { execute } from '../execute.js';

/**
 * Null-bubble cases ported from graphql-js 17
 * `src/execution/incremental/__tests__/defer-test.ts`.
 *
 * Subsequent payloads that would write into a nulled subtree are dropped
 * (Yaacov / IncrementalGraph). IncrementalExecutor / WorkQueue is not ported.
 */

const c = new GraphQLObjectType({
  fields: {
    d: { type: GraphQLString },
    nonNullErrorField: { type: new GraphQLNonNull(GraphQLString) },
  },
  name: 'c',
});

const b = new GraphQLObjectType({
  fields: {
    c: { type: c },
  },
  name: 'b',
});

const a = new GraphQLObjectType({
  fields: {
    b: { type: b },
    someField: { type: GraphQLString },
    nonNullErrorField: { type: new GraphQLNonNull(GraphQLString) },
  },
  name: 'a',
});

const g = new GraphQLObjectType({
  fields: {
    h: { type: GraphQLString },
  },
  name: 'g',
});

const heroType = new GraphQLObjectType({
  fields: {
    name: { type: GraphQLString },
    nonNullName: { type: new GraphQLNonNull(GraphQLString) },
  },
  name: 'Hero',
});

const query = new GraphQLObjectType({
  fields: {
    hero: { type: heroType },
    a: { type: a },
    g: { type: g },
  },
  name: 'Query',
});

const schema = new GraphQLSchema({ query });

const hero = { name: 'Luke' };

async function complete(
  document: DocumentNode,
  rootValue: unknown,
  incrementalSpec?: IncrementalSpec,
) {
  const result = await execute({
    schema,
    document,
    rootValue,
    incrementalSpec,
  });

  if ('initialResult' in result) {
    const results: Array<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult> =
      [result.initialResult];
    for await (const patch of result.subsequentResults) {
      results.push(patch);
    }
    return results;
  }
  return result;
}

function incrementalFieldData(result: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(result)) {
    return [];
  }
  const data: Array<Record<string, unknown>> = [];
  for (const payload of result) {
    const incremental = payload.incremental;
    if (!Array.isArray(incremental)) {
      continue;
    }
    for (const patch of incremental) {
      if (patch.data && typeof patch.data === 'object') {
        data.push(patch.data as Record<string, unknown>);
      }
    }
  }
  return data;
}

describe.each([
  ['v0.1 (default)', undefined],
  ['v0.2', 'v0.2' as const],
])('Execute: null bubbling vs deferred payloads (%s)', (_label, incrementalSpec) => {
  it('Cancels deferred fields when initial result exhibits null bubbling cancelling the defer', async () => {
    const document = parse(`
      query {
        hero {
          nonNullName
          ... @defer {
            name
          }
        }
      }
    `);
    const result = await complete(
      document,
      {
        hero: {
          ...hero,
          nonNullName: () => null,
        },
      },
      incrementalSpec,
    );
    expectJSON(result).toDeepEqual({
      data: {
        hero: null,
      },
      errors: [
        {
          message: 'Cannot return null for non-nullable field Hero.nonNullName.',
          locations: [{ line: 4, column: 11 }],
          path: ['hero', 'nonNullName'],
        },
      ],
    });
  });

  it('Cancels deferred fields when initial result exhibits null bubbling cancelling new fields', async () => {
    const document = parse(`
      query {
        hero {
          nonNullName
        }
        ... @defer {
          hero {
            name
          }
        }
      }
    `);
    const result = await complete(
      document,
      {
        hero: {
          ...hero,
          nonNullName: () => null,
        },
      },
      incrementalSpec,
    );
    expectJSON(result).toDeepEqual({
      data: {
        hero: null,
      },
      errors: [
        {
          message: 'Cannot return null for non-nullable field Hero.nonNullName.',
          locations: [{ line: 4, column: 11 }],
          path: ['hero', 'nonNullName'],
        },
      ],
    });
  });

  it('Keeps deferred work outside nulled error paths', async () => {
    const document = parse(`
      query {
        a {
          ... @defer {
            someField
          }
          nonNullErrorField
        }
        g {
          ... @defer {
            h
          }
        }
      }
    `);
    const result = await complete(
      document,
      {
        a: {
          someField: 'someField',
          nonNullErrorField: null,
        },
        g: {
          h: 'value',
        },
      },
      incrementalSpec,
    );
    const aError = {
      message: 'Cannot return null for non-nullable field a.nonNullErrorField.',
      locations: [{ line: 7, column: 11 }],
      path: ['a', 'nonNullErrorField'],
    };
    if (incrementalSpec === 'v0.2') {
      expectJSON(result).toDeepEqual([
        {
          data: {
            a: null,
            g: {},
          },
          errors: [aError],
          pending: [{ id: '0', path: ['g'] }],
          hasNext: true,
        },
        {
          incremental: [
            {
              data: {
                h: 'value',
              },
              id: '0',
            },
          ],
          completed: [{ id: '0' }],
          hasNext: false,
        },
      ]);
    } else {
      expectJSON(result).toDeepEqual([
        {
          data: {
            a: null,
            g: {},
          },
          errors: [aError],
          hasNext: true,
        },
        {
          incremental: [
            {
              data: {
                h: 'value',
              },
              path: ['g'],
            },
          ],
          hasNext: false,
        },
      ]);
    }
  });

  it('filters a payload with a null that cannot be merged', async () => {
    const document = parse(`
      query {
        ... @defer {
          a {
            someField
            b {
              c {
                nonNullErrorField
              }
            }
          }
        }
        a {
          ... @defer {
            b {
              c {
                d
              }
            }
          }
        }
      }
    `);
    const result = await complete(
      document,
      {
        a: {
          b: {
            c: {
              d: 'd',
              nonNullErrorField: async () => {
                await resolveOnNextTick();
                return null;
              },
            },
          },
          someField: 'someField',
        },
      },
      incrementalSpec,
    );
    expect(JSON.stringify(result)).toContain(
      'Cannot return null for non-nullable field c.nonNullErrorField.',
    );
    for (const patch of incrementalFieldData(result)) {
      const nestedC = (patch.b as { c?: { d?: unknown } } | undefined)?.c;
      if (nestedC != null) {
        expect(nestedC.d).toBeUndefined();
      }
      expect(patch.d).toBeUndefined();
    }
  });

  it('Keeps ancestor deferred siblings when a nested path is nulled', async () => {
    const document = parse(`
      query {
        a {
          b {
            c {
              nonNullErrorField
            }
          }
          ... @defer {
            someField
          }
        }
      }
    `);
    const result = await complete(
      document,
      {
        a: {
          someField: 'someField',
          b: {
            c: {
              nonNullErrorField: async () => {
                await resolveOnNextTick();
                return null;
              },
            },
          },
        },
      },
      incrementalSpec,
    );
    const cError = {
      message: 'Cannot return null for non-nullable field c.nonNullErrorField.',
      locations: [{ line: 6, column: 15 }],
      path: ['a', 'b', 'c', 'nonNullErrorField'],
    };
    if (incrementalSpec === 'v0.2') {
      expectJSON(result).toDeepEqual([
        {
          data: {
            a: {
              b: {
                c: null,
              },
            },
          },
          errors: [cError],
          pending: [{ id: '0', path: ['a'] }],
          hasNext: true,
        },
        {
          incremental: [
            {
              data: {
                someField: 'someField',
              },
              id: '0',
            },
          ],
          completed: [{ id: '0' }],
          hasNext: false,
        },
      ]);
    } else {
      expectJSON(result).toDeepEqual([
        {
          data: {
            a: {
              b: {
                c: null,
              },
            },
          },
          errors: [cError],
          hasNext: true,
        },
        {
          incremental: [
            {
              data: {
                someField: 'someField',
              },
              path: ['a'],
            },
          ],
          hasNext: false,
        },
      ]);
    }
  });

  it('Cancels deferred fields when deferred result exhibits null bubbling', async () => {
    const document = parse(`
      query {
        ... @defer {
          hero {
            nonNullName
            name
          }
        }
      }
    `);
    const result = await complete(
      document,
      {
        hero: {
          ...hero,
          nonNullName: () => null,
        },
      },
      incrementalSpec,
    );
    const heroError = {
      message: 'Cannot return null for non-nullable field Hero.nonNullName.',
      locations: [{ line: 5, column: 13 }],
      path: ['hero', 'nonNullName'],
    };
    if (incrementalSpec === 'v0.2') {
      expectJSON(result).toDeepEqual([
        {
          data: {},
          pending: [{ id: '0', path: [] }],
          hasNext: true,
        },
        {
          incremental: [
            {
              data: {
                hero: null,
              },
              errors: [heroError],
              id: '0',
            },
          ],
          completed: [{ id: '0' }],
          hasNext: false,
        },
      ]);
    } else {
      expectJSON(result).toDeepEqual([
        {
          data: {},
          hasNext: true,
        },
        {
          incremental: [
            {
              data: {
                hero: null,
              },
              errors: [heroError],
              path: [],
            },
          ],
          hasNext: false,
        },
      ]);
    }
  });
});
