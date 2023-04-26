import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { OperationTypeNode, parse } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { stitchSchemas } from '@graphql-tools/stitch';

describe('non-key arguments are taken into account when memoizing result', () => {
  test('memoizes non-key arguments as part of batch delegation', async () => {
    let numCalls = 0;

    const chirpSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Chirp {
          chirpedAtUserId: ID!
        }

        type Query {
          trendingChirps: [Chirp]
        }
      `,
      resolvers: {
        Query: {
          trendingChirps: () => [{ chirpedAtUserId: 1 }, { chirpedAtUserId: 2 }],
        },
      },
    });

    // Mocked author schema
    const authorSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          email: String!
        }

        type Query {
          usersByIds(ids: [ID!], obfuscateEmail: Boolean!): [User]
        }
      `,
      resolvers: {
        Query: {
          usersByIds: (_root, args) => {
            numCalls++;
            return args.ids.map((id: string) => ({ email: args.obfuscateEmail ? '***' : `${id}@test.com` }));
          },
        },
      },
    });

    const linkTypeDefs = /* GraphQL */ `
      extend type Chirp {
        chirpedAtUser(obfuscateEmail: Boolean!): User
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [chirpSchema, authorSchema],
      typeDefs: linkTypeDefs,
      resolvers: {
        Chirp: {
          chirpedAtUser: {
            selectionSet: `{ chirpedAtUserId }`,
            resolve(chirp, args, context, info) {
              return batchDelegateToSchema({
                schema: authorSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'usersByIds',
                key: chirp.chirpedAtUserId,
                argsFromKeys: ids => ({ ids, ...args }),
                context,
                info,
              });
            },
          },
        },
      },
    });

    const query = /* GraphQL */ `
      query {
        trendingChirps {
          withObfuscatedEmail: chirpedAtUser(obfuscateEmail: true) {
            email
          }
          withoutObfuscatedEmail: chirpedAtUser(obfuscateEmail: false) {
            email
          }
        }
      }
    `;

    const result = await execute({ schema: stitchedSchema, document: parse(query) });

    expect(numCalls).toEqual(2);

    if (isIncrementalResult(result)) throw Error('result is incremental');

    expect(result.errors).toBeUndefined();

    const chirps: any = result.data!['trendingChirps'];
    expect(chirps[0].withObfuscatedEmail.email).toBe(`***`);
    expect(chirps[1].withObfuscatedEmail.email).toBe(`***`);

    expect(chirps[0].withoutObfuscatedEmail.email).toBe(`1@test.com`);
    expect(chirps[1].withoutObfuscatedEmail.email).toBe(`2@test.com`);
  });
});
