import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

describe('type merging with only field selection sets', () => {
  const listingsSchema = makeExecutableSchema({
    typeDefs: `
      type Listing {
        id: ID!
        sellerId: ID!
        buyerId: ID
      }
      type Query {
        listing(id: ID!): Listing
      }
    `,
    resolvers: {
      Query: {
        listing: () => ({ id: 1, buyerId: 2, sellerId: 3 })
      },
    },
  });

  const usersSchema = makeExecutableSchema({
    typeDefs: `
      type User {
        id: ID!
        userName: String
      }
      type Listing {
        seller: User!
        buyer: User
      }
      input ListingKeys {
        sellerId: ID
        buyerId: ID
      }
      type Query {
        _listings(keys: [ListingKeys!]!): [Listing]!
      }
    `,
    resolvers: {
      Query: {
        _listings: (_root, args) => args.keys,
      },
      Listing: {
        buyer: (_root, args) => ({ id: args.buyerId, userName: 'Bob' }),
        seller: (_root, args) => ({ id: args.sellerId, userName: 'Tom' }),
      }
    },
  });

  const stitchedSchema = stitchSchemas({
    subschemas: [
      {
        schema: listingsSchema,
        merge: {
          Listing: {
            selectionSet: '{ id }',
            fieldName: 'listing',
            args: ({ id }) => ({ id })
          }
        }
      },
      {
        schema: usersSchema,
        merge: {
          Listing: {
            // selectionSet: '{ id }', // <~ required? We don't need this data for anything here
            fields: {
              buyer: { selectionSet: '{ buyerId }' },
              seller: { selectionSet: '{ sellerId }' },
            },
            fieldName: '_listings',
            key: ({ buyerId, sellerId }) => ({ buyerId, sellerId }),
            argsFromKeys: (keys) => ({ keys }),
          }
        }
      }
    ],
    mergeTypes: true,
  });

  test('errors without selectionSet...', async () => {
    const result = await graphql(
      stitchedSchema, `
        query {
          listing(id: 23) {
            id
            buyer {
              userName
            }
            seller {
              userName
            }
          }
        }
      `,
    );

    const expectedResult = {
      data: {
        listing: {
          id: '1',
          buyer: {
            userName: 'Bob',
          },
          seller: {
            userName: 'Tom',
          }
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});
