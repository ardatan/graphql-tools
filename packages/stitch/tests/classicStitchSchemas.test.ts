import {
  graphql,
  GraphQLSchema,
} from 'graphql';

import { delegateToSchema } from '@graphql-tools/delegate';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { RenameTypes } from "@graphql-tools/wrap";

import { stitchSchemas } from '../src/stitchSchemas';
import { IFieldResolverOptions } from '@graphql-tools/utils';

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

const item: IFieldResolverOptions = {
  resolve(_, args, context, info) {
    return delegateToSchema({
      schema: serviceSchemaConfig,
      fieldName: 'item',
      args,
      context,
      info,
    });
  }
};

const itemByVariant: IFieldResolverOptions = {
  resolve(_, { variant }, context, info) {
    return delegateToSchema({
      schema: serviceSchemaConfig,
      fieldName: 'item',
      args: { id: `item_${variant}` },
      context,
      info,
    });
  },
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
          item,
          itemByVariant
        },
      },
    });
  });

  test('item should work', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query($id: ID!) {
          item(id: $id) {
            __typename
            id
            name
          }
        }
      `,
      {},
      {},
      {
        id: '123',
      },
    );

    expect(result).toEqual({
      data: {
        item: {
          ...ITEM,
          __typename: 'ClassicItem',
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
        itemByVariant: {
          ...ITEM,
          __typename: 'ClassicItem',
        },
      },
    });
  });


});


