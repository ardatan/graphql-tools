import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { stitchSchemas } from '@graphql-tools/stitch';

describe('batch delegation within basic stitching example', () => {
  test('works', async () => {
    let numCalls = 0;

    const chirpSchema = makeExecutableSchema({
      typeDefs: `
        type Chirp {
          chirpedAtUserId: ID!
        }

        type Query {
          trendingChirps: [Chirp]
        }
      `,
      resolvers: {
        Query: {
          trendingChirps: () => [{ chirpedAtUserId: 1 }, { chirpedAtUserId: 2 }]
        }
      }
    });

    // Mocked author schema
    const authorSchema = makeExecutableSchema({
      typeDefs: `
        type User {
          email: String
        }

        type Query {
          usersByIds(ids: [ID!]): [User]
        }
      `,
      resolvers: {
        Query: {
          usersByIds: (_root, args) => {
            numCalls++;
            return args.ids.map((id: string) => ({ email: `${id}@test.com`}));
          }
        }
      }
    });

    const linkTypeDefs = `
      extend type Chirp {
        chirpedAtUser: User
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [chirpSchema, authorSchema],
      typeDefs: linkTypeDefs,
      resolvers: {
        Chirp: {
          chirpedAtUser: {
            selectionSet: `{ chirpedAtUserId }`,
            resolve(chirp, _args, context, info) {
              return batchDelegateToSchema({
                schema: authorSchema,
                operation: 'query',
                fieldName: 'usersByIds',
                key: chirp.chirpedAtUserId,
                mapKeysFn: (ids) => ({ ids }),
                context,
                info,
              });
            },
          },
        },
      },
    });

    const query = `
      query {
        trendingChirps {
          chirpedAtUser {
            email
          }
        }
      }
    `;

    const result = await graphql(stitchedSchema, query);

    expect(numCalls).toEqual(1);
    expect(result.errors).toBeUndefined();
    expect(result.data.trendingChirps[0].chirpedAtUser.email).not.toBe(null);
  });

  test('always selects return type based on delegated query return', async () => {
    let numCalls = 0;

    const sectionsSchema = makeExecutableSchema({
      typeDefs: `
        type Section {
          id: Int!
          title: String
        }
        type Query {
          _sectionsForPosts(postIds: [Int]!): [[Section!]!]!
        }
      `,
      resolvers: {
        Query: {
          _sectionsForPosts: (obj, args) => {
            numCalls += 1;
            return args.postIds.map(id => [
              { id: id+1, title: `Section ${id+1}` },
              { id: id+2, title: `Section ${id+2}` },
            ]);
          }
        }
      }
    });

    const postsSchema = makeExecutableSchema({
      typeDefs: `
        type Post {
          id: Int!
        }
        type Query {
          posts(ids: [Int!]!): [Post]!
        }
      `,
      resolvers: {
        Query: {
          posts: (obj, args) => {
            return args.ids.map(id => ({ id }));
          }
        }
      }
    });

    const linkTypeDefs = `
      extend type Post {
        sections: [Section!]!
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [sectionsSchema, postsSchema],
      typeDefs: linkTypeDefs,
      resolvers: {
        Post: {
          sections: {
            selectionSet: `{ id }`,
            resolve(post, _args, context, info) {
              return batchDelegateToSchema({
                schema: sectionsSchema,
                operation: 'query',
                fieldName: '_sectionsForPosts',
                key: post.id,
                mapKeysFn: (postIds) => ({ postIds }),
                context,
                info,
              });
            },
          },
        },
      },
    });

    const query = `
      query {
        posts(ids: [1, 7]) {
          id
          sections {
            id
            # this field alias will break if returnType is misaligned
            name: title
          }
        }
      }
    `;

    const result = await graphql(stitchedSchema, query);

    expect(numCalls).toEqual(1);
    expect(result.data).toEqual({
      posts: [
        {
          id: 1,
          sections: [
            { id: 2, name: 'Section 2' },
            { id: 3, name: 'Section 3' }
          ]
        },
        {
          id: 7,
          sections: [
            { id: 8, name: 'Section 8' },
            { id: 9, name: 'Section 9' }
          ]
        }
      ]
    });
  });
});
