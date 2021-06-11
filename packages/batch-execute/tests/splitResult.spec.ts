import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { isAsyncIterable } from '@graphql-tools/utils';

import { splitResult } from '../src/splitResult';

describe('splitResult', () => {
  test('it works', async () => {
    const schema = addMocksToSchema({
      schema: makeExecutableSchema({
        typeDefs: `
          type Query {
            object: Object
          }
          type Object {
            field1: String
            field2: String
          }
        `,
      }),
    });

    const mergedQuery = `{
      ... on Query @defer {
        graphqlTools0_object: object {
          field1
        }
      }
      ... on Query @defer {
        graphqlTools1_object: object {
          field2
        }
      }
    }`;

    const result = await graphql(schema, mergedQuery);

    const [zeroResult, oneResult] = splitResult(result, 2);

    const zeroResults = [];
    if (isAsyncIterable(zeroResult)) {
      for await (const payload of zeroResult) {
        zeroResults.push(payload);
      }
    }

    const oneResults = [];
    if (isAsyncIterable(oneResult)) {
      for await (const payload of oneResult) {
        oneResults.push(payload);
      }
    }

    expect(zeroResults).toEqual([{
      data: {},
      hasNext: true,
    }, {
      data: {
        object: {
          field1: 'Hello World',
        },
      },
      path: [],
      hasNext: true,
    }]);
    expect(oneResults).toEqual([{
      data: {},
      hasNext: true,
    }, {
      data: {
        object: {
          field2: 'Hello World',
        },
      },
      path: [],
      hasNext: false,
    }]);
  });
});
