import { parse } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { ExecutionParams } from '@graphql-tools/delegate';

import { mergeExecutionParams } from '../src/mergeExecutionParams';

describe('mergeExecutionParams', () => {
  test('it works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          object: Object
        }
        type Object {
          field1: String
          field2: String
        }
      `,
    });

    const query1 = parse(`{ object { field1 } }`, { noLocation: true });
    const query2 = parse(`{ object { field2 } }`, { noLocation: true });

    const mergedParams = mergeExecutionParams([{ document: query1 }, { document: query2 }], schema, () => ({}));

    const expectedMergedResult: ExecutionParams = {
      document: parse(`{
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
      }`, { noLocation: true }),
      variables: {},
      extensions: {},
      context: undefined,
      info: undefined,
    };

    expect(expectedMergedResult).toMatchObject(mergedParams);
  });
});
