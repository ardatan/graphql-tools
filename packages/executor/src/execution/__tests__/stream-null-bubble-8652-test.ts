import {
  DocumentNode,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
} from 'graphql';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from '../execute.js';
import { execute } from '../execute.js';

const oType = new GraphQLObjectType({
  name: 'O',
  fields: {
    x: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      a: {
        type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        resolve: () => ['a0', null, 'a2'],
      },
      o: {
        type: new GraphQLList(new GraphQLNonNull(oType)),
        resolve: () => [{ x: 'ok0' }, { x: null }, { x: 'ok2' }],
      },
    },
  }),
});

async function complete(document: DocumentNode) {
  const result = await execute({ schema, document });
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

function expectExactJSON(actual: unknown, expected: unknown) {
  expect(JSON.parse(JSON.stringify(actual))).toEqual(expected);
}

describe('stream null-bubble with initialCount 0 (#8652)', () => {
  it('keeps earlier stream items and stops later ones when a non-null item fails', async () => {
    const result = await complete(parse('{ a @stream(initialCount: 0) }'));
    expectExactJSON(result, [
      {
        data: { a: [] },
        hasNext: true,
      },
      {
        incremental: [
          {
            items: ['a0'],
            path: ['a', 0],
          },
        ],
        hasNext: true,
      },
      {
        incremental: [
          {
            items: null,
            path: ['a', 1],
            errors: [
              {
                message: 'Cannot return null for non-nullable field Query.a.',
                locations: [{ line: 1, column: 3 }],
                path: ['a', 1],
              },
            ],
          },
        ],
        hasNext: false,
      },
    ]);
  });

  it('still delivers the enclosing @defer payload before stream null-bubble', async () => {
    const result = await complete(parse('{ ... @defer { o @stream(initialCount: 0) { x } } }'));
    expectExactJSON(result, [
      {
        data: {},
        hasNext: true,
      },
      {
        incremental: [
          {
            data: { o: [] },
            path: [],
          },
        ],
        hasNext: true,
      },
      {
        incremental: [
          {
            items: [{ x: 'ok0' }],
            path: ['o', 0],
          },
        ],
        hasNext: true,
      },
      {
        incremental: [
          {
            items: null,
            path: ['o', 1],
            errors: [
              {
                message: 'Cannot return null for non-nullable field O.x.',
                locations: [{ line: 1, column: 45 }],
                path: ['o', 1, 'x'],
              },
            ],
          },
        ],
        hasNext: false,
      },
    ]);
  });
});
