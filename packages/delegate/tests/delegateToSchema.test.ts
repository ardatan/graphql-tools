import { graphql, OperationTypeNode } from 'graphql';

import { delegateToSchema } from '../src/delegateToSchema.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import { stitchSchemas } from '@graphql-tools/stitch';

function assertSome<T>(input: T): asserts input is Exclude<T, null | undefined> {
  if (input == null) {
    throw new Error('Value should be neither null nor undefined.');
  }
}

describe('delegateToSchema', () => {
  test('should work', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          test(input: String): String
        }
      `,
      resolvers: {
        Query: {
          test: (_root, args) => args.input,
        },
      },
    });

    const outerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          delegateToSchema(input: String): String
        }
      `,
      resolvers: {
        Query: {
          delegateToSchema: (_root, args, context, info) =>
            delegateToSchema({
              schema: innerSchema,
              operation: 'query' as OperationTypeNode,
              fieldName: 'test',
              args,
              context,
              info,
            }),
        },
      },
    });

    const result = await graphql({
      schema: outerSchema,
      source: /* GraphQL */ `
        query {
          delegateToSchema(input: "test")
        }
      `,
    });

    assertSome(result.data);
    expect(result.data['delegateToSchema']).toEqual('test');
  });

  test('should work even where there are default fields', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          test(input: String = "test"): String
        }
      `,
      resolvers: {
        Query: {
          test: (_root, args) => args.input,
        },
      },
    });

    const outerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          delegateToSchema(input: String = "test"): String
        }
      `,
      resolvers: {
        Query: {
          delegateToSchema: (_root, args, context, info) =>
            delegateToSchema({
              schema: innerSchema,
              operation: 'query' as OperationTypeNode,
              fieldName: 'test',
              args,
              context,
              info,
            }),
        },
      },
    });

    const result = await graphql({
      schema: outerSchema,
      source: /* GraphQL */ `
        query {
          delegateToSchema
        }
      `,
    });

    assertSome(result.data);
    expect(result.data['delegateToSchema']).toEqual('test');
  });

  test('should work even when there are variables', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          test(input: String): String
        }
      `,
      resolvers: {
        Query: {
          test: (_root, args) => args.input,
        },
      },
    });

    const outerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          delegateToSchema(input: String): String
        }
      `,
      resolvers: {
        Query: {
          delegateToSchema: (_root, args, context, info) =>
            delegateToSchema({
              schema: innerSchema,
              operation: 'query' as OperationTypeNode,
              fieldName: 'test',
              args,
              context,
              info,
            }),
        },
      },
    });

    const result = await graphql({
      schema: outerSchema,
      source: /* GraphQL */ `
        query ($input: String) {
          delegateToSchema(input: $input)
        }
      `,
      variableValues: {
        input: 'test',
      },
    });

    assertSome(result.data);
    expect(result.data['delegateToSchema']).toEqual('test');
  });
  test('should work even when there are variables for nested fields', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        input TestInput {
          strings: [String]
        }
        type Test {
          strings: [String]
        }
        type Query {
          test(input: TestInput): Test
        }
      `,
      resolvers: {
        Query: {
          test: (_root, args) => args.input,
        },
      },
    });

    const outerSchema = wrapSchema({ schema: innerSchema });

    const result = await graphql({
      schema: outerSchema,
      source: /* GraphQL */ `
        query test($strings: [String]) {
          test(input: { strings: $strings }) {
            strings
          }
        }
      `,
      variableValues: {
        strings: ['foo', 'bar'],
      },
    });

    assertSome(result.data);
    expect(result.data).toEqual({
      test: {
        strings: ['foo', 'bar'],
      },
    });
  });
  test('should work variables in directives', async () => {
    const sourceSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users(input: UsersInput!): [User!]!
        }

        type User {
          name: String!
          age: Int!
        }

        input UsersInput {
          limit: Int
        }
      `,
      resolvers: {
        Query: {
          users: () => {
            return [
              { name: 'ABC', age: 10 },
              { name: 'DEF', age: 20 },
            ];
          },
        },
      },
    });
    const stitchedSchema = stitchSchemas({ subschemas: [sourceSchema] });

    const result = await graphql({
      schema: stitchedSchema,
      source: /* GraphQL */ `
        query ($input: UsersInput!, $skip_age: Boolean!) {
          users(input: $input) {
            name
            age @skip(if: $skip_age)
          }
        }
      `,
      variableValues: { input: { limit: 5 }, skip_age: true },
    });

    expect(result).toEqual({ data: { users: [{ name: 'ABC' }, { name: 'DEF' }] } });
  });
});
