import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';

describe('Custom resolvers', () => {
  const firstSchema = makeExecutableSchema({
    typeDefs: `
      type Widget {
        id: ID!
      }
      type Sprocket {
        id: ID!
      }
      type Query {
        widget(id: ID!): Widget
        sprocket(id: ID!): Sprocket
      }
    `,
    resolvers: {
      Query: {
        widget: (root, { id }) => ({ id }),
        sprocket: (root, { id }) => ({ id }),
      }
    }
  });

  const secondSchema = makeExecutableSchema({
    typeDefs: `
      type Widget {
        id: ID!
        resolved: Boolean
      }
      type Sprocket {
        id: ID!
        resolved: Boolean
      }
      type Query {
        _widgets(ids: [ID!]!): [Widget]!
        _sprocket(id: ID!): Sprocket
      }
    `,
    resolvers: {
      Query: {
        _widgets: (root, { ids }) => ids.map(id => ({ id, resolved: true })),
        _sprocket: (root, { id }) => ({ id, resolved: true }),
      }
    }
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: firstSchema,
      },
      {
        schema: secondSchema,
        merge: {
          Widget: {
            selectionSet: '{ id }',
            fieldName: '_widgets',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
            resolve: ({ id }) => Number(id) > 5 ? null : undefined,
          },
          Sprocket: {
            selectionSet: '{ id }',
            fieldName: '_sprocket',
            args: ({ id }) => ({ id }),
            resolve: ({ id }) => Number(id) > 5 ? null : undefined,
          },
        },
      },
    ]
  });

  it('passes undefined from custom resolvers through to delegation', async () => {
    const { data } = await graphql(gatewaySchema, `
      query {
        widget(id: 1) { id resolved }
        sprocket(id: 1) { id resolved }
      }
    `);

    expect(data).toEqual({
      widget: { id: '1', resolved: true },
      sprocket: { id: '1', resolved: true },
    });
  });

  it('passes value from custom resolvers directly to return', async () => {
    const { data } = await graphql(gatewaySchema, `
      query {
        widget(id: 10) { id resolved }
        sprocket(id: 10) { id resolved }
      }
    `);

    expect(data).toEqual({
      widget: { id: '10', resolved: null },
      sprocket: { id: '10', resolved: null },
    });
  });
});
