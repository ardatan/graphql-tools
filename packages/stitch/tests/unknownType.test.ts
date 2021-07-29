import {
  graphql,
  GraphQLError,
  GraphQLSchema,
  versionInfo,
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

    const errorMessagesByVersion = {
      14: `Abstract type ClassicItemInterface must resolve to an Object type at runtime for field Query.itemByVariant with value { __typename: "Item", id: "123", name: "Foo bar 42" }, received "undefined". Either the ClassicItemInterface type should provide a "resolveType" function or each possible type should provide an "isTypeOf" function.`,
      15: `Abstract type "ClassicItemInterface" was resolve to a type "Item" that does not exist inside schema.`,
    }

    expect(result).toEqual({
      data: {
        itemByVariant: null,
      },
      errors: [new GraphQLError(errorMessagesByVersion[versionInfo.major])],
    });
  });


});


