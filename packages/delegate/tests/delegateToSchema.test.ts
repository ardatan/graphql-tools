import { graphql, OperationTypeNode, parse } from 'graphql';
import _ from 'lodash';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { asArray, ExecutionResult, isAsyncIterable, mergeDeep } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { delegateToSchema } from '../src/delegateToSchema.js';

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
  test('should work with @stream', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        directive @stream on FIELD
        type Query {
          test: [String]
        }
      `,
      resolvers: {
        Query: {
          test: async function* () {
            yield 'foo';
            yield 'bar';
            yield 'baz';
          },
        },
      },
    });
    const outerSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          test: [String]
        }
      `,
      resolvers: {
        Query: {
          test: (_root, _args, context, info) =>
            delegateToSchema({
              schema: innerSchema,
              operation: 'query' as OperationTypeNode,
              fieldName: 'test',
              args: {},
              context,
              info,
            }),
        },
      },
    });
    const res = await normalizedExecutor({
      schema: outerSchema,
      document: parse(/* GraphQL */ `
        query {
          test @stream
        }
      `),
    });
    if (!isAsyncIterable(res)) {
      throw new Error('Expected result to be an AsyncIterable');
    }
    const values = [];
    for await (const value of res) {
      values.push(value);
    }
    expect(values).toMatchInlineSnapshot(`
[
  {
    "data": {
      "test": [],
    },
    "hasNext": true,
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "items": [
          "foo",
        ],
        "path": [
          "test",
          0,
        ],
      },
    ],
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "items": [
          "bar",
        ],
        "path": [
          "test",
          1,
        ],
      },
    ],
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "items": [
          "baz",
        ],
        "path": [
          "test",
          2,
        ],
      },
    ],
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "items": [
          null,
        ],
        "path": [
          "test",
          3,
        ],
      },
    ],
  },
  {
    "hasNext": false,
  },
]
`);
    const result = mergeIncrementalResults(values);
    expect(result).toEqual({ data: { test: ['foo', 'bar', 'baz'] } });
  });
});

function mergeIncrementalResults(values: ExecutionResult[]) {
  const result: ExecutionResult = {};
  for (const value of values) {
    if (value.data) {
      if (!result.data) {
        result.data = value.data;
      } else {
        result.data = mergeDeep([result.data, value.data]);
      }
    }
    if (value.errors) {
      result.errors = result.errors || [];
      result.errors = [...result.errors, ...value.errors];
    }
    if (value.incremental) {
      for (const incremental of value.incremental) {
        if (incremental.path) {
          result.data = result.data || {};
          const incrementalItems = incremental.items
            ? asArray(incremental.items).filter(item => item != null)
            : [];
          if (incremental.data != null) {
            incrementalItems.unshift(incremental.data);
          }
          for (const incrementalItem of incrementalItems) {
            if (!incremental.path.length) {
              result.data = mergeDeep([result.data, incrementalItem]);
            } else {
              const existingData = _.get(result.data, incremental.path);
              if (!existingData) {
                _.set(result.data, incremental.path, incrementalItem);
              } else {
                _.set(result.data, incremental.path, mergeDeep([existingData, incrementalItem]));
              }
            }
          }
        }
        if (incremental.errors) {
          result.errors = result.errors || [];
          result.errors = [...result.errors, ...incremental.errors];
        }
      }
    }
  }
  return result;
}
