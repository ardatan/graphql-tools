import { graphql, GraphQLSchema } from 'graphql';

import { delegateToSchema } from '@graphql-tools/delegate';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { RenameTypes } from '@graphql-tools/wrap';

import { stitchSchemas } from '../src/stitchSchemas.js';

const ITEM = {
  __typename: 'Item',
  id: '123',
  name: 'Foo bar 42',
};

const serviceSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    interface ItemInterface {
      id: ID!
      name: String
    }

    type Item implements ItemInterface {
      id: ID!
      name: String
    }

    type Query {
      item(id: ID!): ItemInterface
    }
  `,
  resolvers: {
    Query: {
      item: () => ITEM,
    },
  },
});

const serviceSchemaConfig = {
  schema: serviceSchema,
  transforms: [new RenameTypes((name: string) => `Classic${name}`)],
};

describe('test delegateToSchema() with type renaming', () => {
  let stitchedSchema: GraphQLSchema;

  const typeDefs = /* GraphQL */ `
    enum Variant {
      A
      B
      C
    }

    extend type Query {
      itemByVariant(variant: Variant): ClassicItemInterface
    }
  `;

  beforeAll(async () => {
    stitchedSchema = stitchSchemas({
      subschemas: [serviceSchemaConfig],
      typeDefs,
      resolvers: {
        Query: {
          itemByVariant: (_, { variant }, context, info) =>
            delegateToSchema({
              schema: serviceSchema,
              fieldName: 'item',
              args: { id: `item_${variant}` },
              context,
              info,
            }),
        },
      },
    });
  });

  test('itemByVariant should work', async () => {
    const result = await graphql({
      schema: stitchedSchema,
      source: /* GraphQL */ `
        query ($variant: Variant!) {
          itemByVariant(variant: $variant) {
            __typename
            id
            name
          }
        }
      `,
      variableValues: {
        variant: 'A',
      },
    });

    expect(result.data?.['itemByVariant']).toBeNull();
    expect(result.errors).toHaveLength(1);
  });
});
