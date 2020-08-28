import {
  graphql,
  GraphQLSchema,
} from 'graphql';

import { delegateToSchema } from '@graphql-tools/delegate';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { HoistField, PruneSchema } from "@graphql-tools/wrap";

import { stitchSchemas } from '../src/stitchSchemas';

const ITEM = {
	__typename: "Item",
	id: "123",
	name: "Foo bar 42",
};

const classicSchema = makeExecutableSchema({
  typeDefs: `
    interface Node {
      id: ID!
    }

    interface ItemInterface {
      id: ID!
      name: String
    }

    type Item implements Node & ItemInterface {
      id: ID!
      name: String
    }

    type Query {
      node(id: ID!): Node
      viewer: Viewer
    }
    type Viewer {
      item(id: ID!): ItemInterface
    }
  `,
  resolvers: {
    Query: {
      node: () => ITEM,
    },
    Viewer: {
      item: () => ITEM
    },
  }
});

const typeDefs = `

extend type Query {
  coloredItem(id: ID!): ColoredItem
}

interface ColoredItem {
  id: ID!
  name: String
  color: String
}

extend type Item implements ColoredItem {
  color: String
}
`;



describe('merge schema through HoistField transforms', () => {
  let stitchedSchema: GraphQLSchema;

  beforeAll(async () => {

    stitchedSchema = stitchSchemas({
      subschemas: [{
        schema: classicSchema,
        transforms: [
          new HoistField('Query', ['viewer', 'item'], 'item'),
          // we have to prune the now empty Viewer type
          new PruneSchema({}),
        ]
      }],
      typeDefs,
      resolvers: {
        Query: {
          coloredItem: {
            resolve(_, { id }, context, info) {
              return delegateToSchema({
                schema: classicSchema,
                fieldName: 'item',
                args: { id },
                context,
                info,
              });
            },
          },
        },
        Item: {
          color: () => "#000"
        },
      },
    });
  });

  test('node should work', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query($id: ID!) {
          node(id: $id) {
            __typename
            id
          }
        }
      `,
      {},
      {},
      { id: '123' }
    );

    expect(result).toEqual({
      data: {
        node: {
          __typename: 'Item',
          id: '123'
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
        item: ITEM,
      },
    });
  });

  test('coloredItem should work', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query($id: ID!) {
          coloredItem(id: $id) {
            __typename
            id
            name
            color
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
        coloredItem: {
          ...ITEM,
          color: '#000'
        },
      },
    });
  });
});
