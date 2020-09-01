import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { addMocksToSchema } from '@graphql-tools/mock';

describe('new', () => {
  it('works', () => {
    const imageSchema = makeExecutableSchema({
      typeDefs: `
        type Image {
          id: ID!
          url: String!
        }

        type Query {
          images(ids: [ID!]!): [Image]!
        }
      `
    });

    const contentSchema = makeExecutableSchema({
      typeDefs: `
        type Post {
          leadArt: LeadArt
        }

        type Image {
          id: ID!
        }

        type Video {
          id: ID!
          url: String!
        }

        union LeadArt = Image | Video

        type Query {
          posts(ids: [ID!]!): [Post]!
        }
      `
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: addMocksToSchema({ schema: imageSchema }),
          merge: {
            Image: {
              selectionSet: '{ id }',
              fieldName: 'images',
              key: ({ id }) => id,
              argsFromKeys: (ids) => ({ ids }),
            },
          },
        },
        {
          schema: addMocksToSchema({ schema: contentSchema }),
          merge: {
            Post: {
              selectionSet: '{ id }',
              fieldName: 'posts',
              key: ({ id }) => id,
              argsFromKeys: (ids) => ({ ids }),
            },
          },
        },
      ],
      mergeTypes: true
    });

    expect(gatewaySchema).toBeInstanceOf(GraphQLSchema);
  });
});