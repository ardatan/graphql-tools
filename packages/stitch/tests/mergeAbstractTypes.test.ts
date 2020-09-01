import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';

describe('Abstract type merge', () => {
  it('merges with abstract type definitions', async () => {
    const imageSchema = makeExecutableSchema({
      typeDefs: `
        type Image {
          id: ID!
          url: String!
        }
        type Query {
          image(id: ID!): Image
        }
      `,
      resolvers: {
        Query: {
          image: (root, { id }) => ({ id, url: `/path/to/${id}` }),
        }
      }
    });

    const contentSchema = makeExecutableSchema({
      typeDefs: `
        type Post {
          id: ID!
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
          post(id: ID!): Post
        }
      `,
      resolvers: {
        Query: {
          post: (root, { id }) => ({ id, leadArt: { __typename: 'Image', id: '23' } }),
        }
      }
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: imageSchema,
          merge: {
            Image: {
              selectionSet: '{ id }',
              fieldName: 'image',
              args: ({ id }) => ({ id }),
            },
          },
        },
        {
          schema: contentSchema,
          merge: {
            Post: {
              selectionSet: '{ id }',
              fieldName: 'post',
              args: ({ id }) => ({ id }),
            },
          },
        },
      ],
      mergeTypes: true
    });

    const { data } = await graphql(gatewaySchema, `
      query {
        post(id: 55) {
          leadArt {
            __typename
            ...on Image {
              id
              url
            }
          }
        }
      }
    `);

    expect(data.post.leadArt).toEqual({
      __typename: 'Image',
      url: '/path/to/23',
      id: '23',
    });
  });
});