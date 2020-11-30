import {
  graphql,
  GraphQLError,
  GraphQLSchema,
} from 'graphql';

import { delegateToSchema } from '@graphql-tools/delegate';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { RenameTypes } from '@graphql-tools/wrap';

import { stitchSchemas } from '../src/stitchSchemas';

const ITEM = {
  __typename: "Item",
  id: "123",
  name: "Foo bar 42",
};

const serviceSchema = makeExecutableSchema({
  typeDefs: `
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
  }
});

const serviceSchemaConfig = {
  schema: serviceSchema,
  transforms: [
    new RenameTypes((name: string) => `Classic${name}`),
  ]
};

describe('test delegateToSchema() with type renaming', () => {
  let stitchedSchema: GraphQLSchema;

  const typeDefs = `
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
          itemByVariant: (_, { variant }, context, info) => delegateToSchema({
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
    const result = await graphql(
      stitchedSchema,
      `
        query($variant: Variant!) {
          itemByVariant(variant: $variant) {
            __typename
            id
            name
          }
        }
      `,
      {},
      {},
      {
        variant: 'A',
      },
    );

    expect(result).toEqual({
      data: {
        itemByVariant: null,
      },
      errors: [new GraphQLError(`Unable to resolve type 'Item'. Did you forget to include a transform that renames types? Did you delegate to the original subschema rather that the subschema config object containing the transform?`)],
    });
  });


});


