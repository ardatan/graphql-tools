import { buildSchema, OperationTypeNode, parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { MoveRootField } from '../src/transforms/MoveRootField';
import { wrapSchema } from '../src/wrapSchema';

describe('MoveRootField', () => {
  it('moves the field to a non existing type', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
        bar: String
      }
    `);
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new MoveRootField({
          query: {
            foo: 'mutation' as OperationTypeNode,
          },
          mutation: {},
          subscription: {},
        }),
      ],
    });
    expect(printSchemaWithDirectives(newSchema).trim()).toMatchInlineSnapshot(`
      "schema {
        query: Query
        mutation: Mutation
      }

      type Query {
        bar: String
      }

      type Mutation {
        foo: String
      }"
    `);
  });
  it('executes the field on the new type', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
          bar: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => 'FOO',
          bar: () => 'BAR',
        },
      },
    });
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new MoveRootField({
          query: {
            foo: 'mutation' as OperationTypeNode,
          },
          mutation: {},
          subscription: {},
        }),
      ],
    });
    const result = await normalizedExecutor({
      schema: newSchema,
      document: parse(/* GraphQL */ `
        mutation {
          __typename
          foo
        }
      `),
    });
    expect(result).toEqual({ data: { __typename: 'Mutation', foo: 'FOO' } });
  });
});
