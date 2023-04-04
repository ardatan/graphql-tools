import { OperationTypeNode, buildSchema, parse } from 'graphql';
import { wrapSchema } from '../src/wrapSchema';
import { MoveRootField } from '../src/transforms/MoveRootField';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { normalizedExecutor } from '@graphql-tools/executor';

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
            foo: OperationTypeNode.MUTATION,
          },
          mutation: {},
          subscription: {},
        }),
      ],
    });
    expect(printSchemaWithDirectives(newSchema)).toMatchInlineSnapshot(`
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
            foo: OperationTypeNode.MUTATION,
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
