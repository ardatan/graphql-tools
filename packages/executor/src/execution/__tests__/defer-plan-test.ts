import { DocumentNode, GraphQLObjectType, GraphQLSchema, GraphQLString, parse } from 'graphql';
import { expectJSON } from '../../__testUtils__/expectJSON.js';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from '../execute.js';
import { execute } from '../execute.js';

/**
 * Overlapping-field plan cases from graphql-js 17
 * `src/execution/incremental/__tests__/defer-test.ts`.
 */

const deeperObject = new GraphQLObjectType({
  fields: {
    foo: { type: GraphQLString },
    bar: { type: GraphQLString },
    baz: { type: GraphQLString },
    bak: { type: GraphQLString },
  },
  name: 'DeeperObject',
});

const nestedObject = new GraphQLObjectType({
  fields: {
    deeperObject: { type: deeperObject },
  },
  name: 'NestedObject',
});

const anotherNestedObject = new GraphQLObjectType({
  fields: {
    deeperObject: { type: deeperObject },
  },
  name: 'AnotherNestedObject',
});

const heroType = new GraphQLObjectType({
  fields: {
    nestedObject: { type: nestedObject },
    anotherNestedObject: { type: anotherNestedObject },
  },
  name: 'Hero',
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    fields: {
      hero: { type: heroType },
    },
    name: 'Query',
  }),
});

async function complete(document: DocumentNode, rootValue: unknown) {
  const result = await execute({
    schema,
    document,
    rootValue,
    incrementalSpec: 'v0.2',
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

describe('Execute: non-duplicating @defer plan', () => {
  it('Deduplicates fields present in the initial payload', async () => {
    const document = parse(`
      query {
        hero {
          nestedObject {
            deeperObject {
              foo
            }
          }
          anotherNestedObject {
            deeperObject {
              foo
            }
          }
          ... @defer {
            nestedObject {
              deeperObject {
                bar
              }
            }
            anotherNestedObject {
              deeperObject {
                foo
              }
            }
          }
        }
      }
    `);
    const result = await complete(document, {
      hero: {
        nestedObject: { deeperObject: { foo: 'foo', bar: 'bar' } },
        anotherNestedObject: { deeperObject: { foo: 'foo' } },
      },
    });
    expectJSON(result).toDeepEqual([
      {
        data: {
          hero: {
            nestedObject: {
              deeperObject: {
                foo: 'foo',
              },
            },
            anotherNestedObject: {
              deeperObject: {
                foo: 'foo',
              },
            },
          },
        },
        pending: [{ id: '0', path: ['hero', 'nestedObject', 'deeperObject'] }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: { bar: 'bar' },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Deduplicates fields present in a parent defer payload', async () => {
    const document = parse(`
      query {
        hero {
          ... @defer {
            nestedObject {
              deeperObject {
                foo
                ... @defer {
                  foo
                  bar
                }
              }
            }
          }
        }
      }
    `);
    const result = await complete(document, {
      hero: { nestedObject: { deeperObject: { foo: 'foo', bar: 'bar' } } },
    });
    expectJSON(result).toDeepEqual([
      {
        data: {
          hero: {},
        },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        pending: [{ id: '1', path: ['hero', 'nestedObject', 'deeperObject'] }],
        incremental: [
          {
            data: {
              nestedObject: {
                deeperObject: { foo: 'foo' },
              },
            },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: {
              bar: 'bar',
            },
            id: '1',
          },
        ],
        completed: [{ id: '1' }],
        hasNext: false,
      },
    ]);
  });

  it('Deduplicates fields with deferred fragments at multiple levels', async () => {
    const document = parse(`
      query {
        hero {
          nestedObject {
            deeperObject {
              foo
            }
          }
          ... @defer {
            nestedObject {
              deeperObject {
                foo
                bar
              }
              ... @defer {
                deeperObject {
                  foo
                  bar
                  baz
                  ... @defer {
                    foo
                    bar
                    baz
                    bak
                  }
                }
              }
            }
          }
        }
      }
    `);
    const result = await complete(document, {
      hero: {
        nestedObject: {
          deeperObject: { foo: 'foo', bar: 'bar', baz: 'baz', bak: 'bak' },
        },
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('"foo":"foo"');
    expect(serialized).toContain('"bar":"bar"');
    expect(serialized).toContain('"baz":"baz"');
    expect(serialized).toContain('"bak":"bak"');
    const initial = Array.isArray(result) ? result[0] : result;
    expect('data' in initial).toBe(true);
    expectJSON('data' in initial ? initial.data : undefined).toDeepEqual({
      hero: {
        nestedObject: {
          deeperObject: {
            foo: 'foo',
          },
        },
      },
    });
    expect(serialized.match(/"foo":"foo"/g)?.length).toBe(1);
  });
});
