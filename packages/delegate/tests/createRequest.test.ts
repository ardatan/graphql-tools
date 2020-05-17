import { graphql, Kind } from 'graphql';

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
          delegate: (_root, args) => {
            const request = createRequest({
              fieldNodes: [{
                kind: Kind.FIELD,
                name: {
                  kind: Kind.NAME,
                  value: 'delegate',
                },
                arguments: [{
                  kind: Kind.ARGUMENT,
                  name: {
                    kind: Kind.NAME,
                    value: 'input',
                  },
                  value: {
                    kind: Kind.STRING,
                    value: args.input,
                  }
                }]
              }],
              targetOperation: 'query',
              targetFieldName: 'test',
            });
            return delegateRequest({
              request,
              schema: innerSchema,
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

  test('should work with adding args on delegation', async () => {
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
          delegate: (_root, args) => {
            const request = createRequest({
              targetOperation: 'query',
              targetFieldName: 'test',
            });
            return delegateRequest({
              request,
              schema: innerSchema,
              args,
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
