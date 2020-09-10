import {
  graphql,
  GraphQLSchema,
  SelectionSetNode,
  Kind,
} from 'graphql';

import { delegateToSchema } from '@graphql-tools/delegate';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { RenameTypes, TransformQuery } from "@graphql-tools/wrap";

import { stitchSchemas } from '../src/stitchSchemas';
import { IFieldResolverOptions } from '@graphql-tools/utils';

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
      item: () => ITEM,
    },
  }
});

const item: IFieldResolverOptions = {
  resolve(_, { id }, context, info) {
    return delegateToSchema({
      schema: classicSchema,
      fieldName: 'viewer',
      context,
      info,
      transforms: [
        // Wrap document takes a subtree as an AST node
        new TransformQuery({
          // path at which to apply wrapping and extracting
          path: ['viewer'],
          queryTransformer: (subtree: SelectionSetNode) => ({
            kind: Kind.SELECTION_SET,
            selections: [
              {
                // we create a wrapping AST Field
                kind: Kind.FIELD,
                name: {
                  kind: Kind.NAME,
                  value: 'item',
                },
                // add arguments
                arguments: {
                  kind: Kind.ARGUMENT,
                  name: { kind: Kind.NAME, value: 'id' },
                  value: { kind: Kind.STRING, value: id as string },
                },
                // Inside the field selection
                selectionSet: subtree,
              },
            ],
          }),
          // how to process the data result at path
          resultTransformer: (result) => result?.viewer,
          errorPathTransformer: (path) => path.slice(1),
        }),
      ],
    });
  }
};

const itemByVariant: IFieldResolverOptions = {
  resolve(_, { variant }, context, info) {
    return delegateToSchema({
      schema: classicSchema,
      fieldName: 'node',
      args: { id: `item_${variant}` },
      context,
      info,
    });
  },
};


describe('test TransformQuery with type renaming', () => {
  let stitchedSchema: GraphQLSchema;

  const typeDefs = `
  enum Variant {
    A
    B
    C
  }

  extend type Query {
    item(id: ID!): ClassicItemInterface
    itemByVariant(variant: Variant): ClassicItemInterface
  }
 `;

  beforeAll(async () => {

    stitchedSchema = stitchSchemas({
      subschemas: [{
        schema: classicSchema,
        transforms: [
           new RenameTypes((name: string) => `Classic${name}`, {
						renameBuiltins: false,
						renameScalars: false
					}),
        ]
      }],
      typeDefs,
      resolvers: {
        Query: {
          item,
          itemByVariant
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
          __typename: 'ClassicItem',
          id: '123'
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
        itemByVariant: ITEM,
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
});



describe('test TransformQuery without type renaming', () => {
  let stitchedSchema: GraphQLSchema;

  const typeDefs = `
    enum Variant {
      A
      B
      C
    }

    extend type Query {
      item(id: ID!): ItemInterface
      itemByVariant(variant: Variant): ItemInterface
    }
   `;

  beforeAll(async () => {

    stitchedSchema = stitchSchemas({
      subschemas: [{
        schema: classicSchema,
        transforms: [],
      }],
      typeDefs,
      resolvers: {
        Query: {
          item,
          itemByVariant
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
        itemByVariant: ITEM,
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
});

