import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

describe('Abstract type merge', () => {
  it('merges with abstract type definitions', async () => {
    const imageSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
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
          image: (_root, { id }) => ({ id, url: `/path/to/${id}` }),
        },
      },
    });

    const contentSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
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
          post: (_root, { id }) => ({ id, leadArt: { __typename: 'Image', id: '23' } }),
        },
      },
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
    });

    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          post(id: 55) {
            leadArt {
              __typename
              ... on Image {
                id
                url
              }
            }
          }
        }
      `,
    });
    assertSome(data);
    const postData: any = data['post'];
    expect(postData.leadArt).toEqual({
      __typename: 'Image',
      url: '/path/to/23',
      id: '23',
    });
  });
});

describe('Merged associations', () => {
  const layoutSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      interface Slot {
        id: ID!
      }
      type Post implements Slot {
        id: ID!
      }
      type Network {
        id: ID!
        domain: String
      }
      type Query {
        slots(ids: [ID!]!): [Slot]!
        posts(ids: [ID!]!): [Post]!
        networks(ids: [ID!]!): [Network]!
      }
    `,
    resolvers: {
      Query: {
        slots: (_root, { ids }) => ids.map((id: any) => ({ __typename: 'Post', id })),
        posts: (_root, { ids }) => ids.map((id: any) => ({ id })),
        networks: (_root, { ids }) => ids.map((id: any) => ({ id, domain: `network${id}.com` })),
      },
    },
  });

  const postsSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Post {
        id: ID!
        title: String!
        network: Network
      }
      type Network {
        id: ID!
      }
      type Query {
        _posts(ids: [ID!]!): [Post]!
      }
    `,
    resolvers: {
      Query: {
        _posts: (_root, { ids }) =>
          ids.map((id: any) => ({ id, title: `Post ${id}`, network: { id: Number(id) + 1 } })),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: layoutSchema,
        merge: {
          Network: {
            selectionSet: '{ id }',
            fieldName: 'networks',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
          },
        },
      },
      {
        schema: postsSchema,
        merge: {
          Post: {
            selectionSet: '{ id }',
            fieldName: '_posts',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
          },
        },
      },
    ],
  });

  it('merges associations onto abstract types', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          slots(ids: [55]) {
            id
            ... on Post {
              network {
                domain
              }
            }
          }
        }
      `,
    });

    assertSome(data);
    expect(data['slots']).toEqual([
      {
        id: '55',
        network: { domain: 'network56.com' },
      },
    ]);
  });
});
