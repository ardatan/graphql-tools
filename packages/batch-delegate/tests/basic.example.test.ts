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
});
