import { graphql } from 'graphql';

import { createRequest } from '../src/createRequest';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { delegateRequest } from '../src/delegateToSchema';

describe('bare requests', () => {
  test('should work', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          test(input: String): String
        }
      `,
      resolvers: {
        Query: {
          test: (_root, args) => args.input
        },
      },
    });

    const outerSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          delegate(input: String): String
        }
      `,
      resolvers: {
        Query: {
          delegate: (_root, args, context, info) => {
            const request = createRequest({
              targetOperation: 'query',
              targetFieldName: 'test',
            });
            return delegateRequest({
              request,
              schema: innerSchema,
              fieldName: 'test',
              args,
              context,
              info
            });
          },
        },
      },
    });

    const result = await graphql(
      outerSchema,
      `
        query {
          delegate(input: "test")
        }
      `,
    );

    expect(result.data.delegate).toEqual('test');
  });
});
