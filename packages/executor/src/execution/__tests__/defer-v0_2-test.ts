import {
  DocumentNode,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import { expectJSON } from '../../__testUtils__/expectJSON.js';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from '../execute.js';
import { execute } from '../execute.js';

/**
 * Payload-format cases ported from graphql-js 17
 * `src/execution/incremental/__tests__/defer-test.ts`
 * (experimental incremental spec v0.2).
 */

const friendType = new GraphQLObjectType({
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    nonNullName: { type: new GraphQLNonNull(GraphQLString) },
  },
  name: 'Friend',
});

const friends = [
  { name: 'Han', id: 2 },
  { name: 'Leia', id: 3 },
  { name: 'C-3PO', id: 4 },
];

const hero = { name: 'Luke', id: 1, friends };

const heroType = new GraphQLObjectType({
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    nonNullName: { type: new GraphQLNonNull(GraphQLString) },
    friends: { type: new GraphQLList(friendType) },
  },
  name: 'Hero',
});

const query = new GraphQLObjectType({
  fields: {
    hero: { type: heroType },
  },
  name: 'Query',
});

const schema = new GraphQLSchema({ query });

async function complete(document: DocumentNode, rootValue: unknown = { hero }) {
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

describe('Execute: defer directive (incremental spec v0.2)', () => {
  it('Can defer fragments containing scalar types', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ...NameFragment @defer
        }
      }
      fragment NameFragment on Hero {
        name
      }
    `);
    const result = await complete(document);

    expectJSON(result).toDeepEqual([
      {
        data: {
          hero: {
            id: '1',
          },
        },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: {
              name: 'Luke',
            },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Returns label from defer directive', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ...NameFragment @defer(label: "defer-label")
        }
      }
      fragment NameFragment on Hero {
        name
      }
    `);
    const result = await complete(document);

    expectJSON(result).toDeepEqual([
      {
        data: {
          hero: {
            id: '1',
          },
        },
        pending: [{ id: '0', path: ['hero'], label: 'defer-label' }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: {
              name: 'Luke',
            },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Treats null defer label the same as no label', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ...NameFragment @defer(label: null)
        }
      }
      fragment NameFragment on Hero {
        name
      }
    `);
    const result = await complete(document);

    expectJSON(result).toDeepEqual([
      {
        data: { hero: { id: '1' } },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: { name: 'Luke' },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Can disable defer using if argument', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ...NameFragment @defer(if: false)
        }
      }
      fragment NameFragment on Hero {
        name
      }
    `);
    const result = await complete(document);

    expectJSON(result).toDeepEqual({
      data: {
        hero: {
          id: '1',
          name: 'Luke',
        },
      },
    });
  });

  it('Does not disable defer with null if argument', async () => {
    const document = parse(`
      query HeroNameQuery($shouldDefer: Boolean) {
        hero {
          id
          ...NameFragment @defer(if: $shouldDefer)
        }
      }
      fragment NameFragment on Hero {
        name
      }
    `);
    const result = await complete(document);
    expectJSON(result).toDeepEqual([
      {
        data: { hero: { id: '1' } },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: { name: 'Luke' },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Can defer fragments on the top level Query field', async () => {
    const document = parse(`
      query HeroNameQuery {
        ...QueryFragment @defer(label: "DeferQuery")
      }
      fragment QueryFragment on Query {
        hero {
          id
        }
      }
    `);
    const result = await complete(document);

    expectJSON(result).toDeepEqual([
      {
        data: {},
        pending: [{ id: '0', path: [], label: 'DeferQuery' }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: {
              hero: {
                id: '1',
              },
            },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Can defer a fragment within an already deferred fragment', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          ...TopFragment @defer(label: "DeferTop")
        }
      }
      fragment TopFragment on Hero {
        id
        ...NestedFragment @defer(label: "DeferNested")
      }
      fragment NestedFragment on Hero {
        friends {
          name
        }
      }
    `);
    const result = await complete(document);

    expectJSON(result).toDeepEqual([
      {
        data: {
          hero: {},
        },
        pending: [{ id: '0', path: ['hero'], label: 'DeferTop' }],
        hasNext: true,
      },
      {
        pending: [{ id: '1', path: ['hero'], label: 'DeferNested' }],
        incremental: [
          {
            data: {
              id: '1',
            },
            id: '0',
          },
          {
            data: {
              friends: [{ name: 'Han' }, { name: 'Leia' }, { name: 'C-3PO' }],
            },
            id: '1',
          },
        ],
        completed: [{ id: '0' }, { id: '1' }],
        hasNext: false,
      },
    ]);
  });

  it('Can defer an inline fragment', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ... on Hero @defer {
            name
          }
        }
      }
    `);
    const result = await complete(document);
    expectJSON(result).toDeepEqual([
      {
        data: { hero: { id: '1' } },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: { name: 'Luke' },
            id: '0',
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Handles errors thrown in deferred fragments', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ...NameFragment @defer
        }
      }
      fragment NameFragment on Hero {
        name
      }
    `);
    const result = await complete(document, {
      hero: {
        ...hero,
        name: () => {
          throw new Error('bad');
        },
      },
    });
    expectJSON(result).toDeepEqual([
      {
        data: { hero: { id: '1' } },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        incremental: [
          {
            data: { name: null },
            id: '0',
            errors: [
              {
                message: 'bad',
                locations: [{ line: 9, column: 9 }],
                path: ['hero', 'name'],
              },
            ],
          },
        ],
        completed: [{ id: '0' }],
        hasNext: false,
      },
    ]);
  });

  it('Handles non-nullable errors thrown in deferred fragments', async () => {
    const document = parse(`
      query HeroNameQuery {
        hero {
          id
          ...NameFragment @defer
        }
      }
      fragment NameFragment on Hero {
        nonNullName
      }
    `);
    const result = await complete(document, {
      hero: {
        ...hero,
        nonNullName: () => null,
      },
    });
    expectJSON(result).toDeepEqual([
      {
        data: { hero: { id: '1' } },
        pending: [{ id: '0', path: ['hero'] }],
        hasNext: true,
      },
      {
        completed: [
          {
            id: '0',
            errors: [
              {
                message: 'Cannot return null for non-nullable field Hero.nonNullName.',
                locations: [{ line: 9, column: 9 }],
                path: ['hero', 'nonNullName'],
              },
            ],
          },
        ],
        hasNext: false,
      },
    ]);
  });
});
