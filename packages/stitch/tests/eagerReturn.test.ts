import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';

describe('eager returns', () => {
  let metadataRequests = 0;

  const posts = [
    { id: '1', productDealId: null, restaurantId: null },
    { id: '2', productDealId: null, restaurantId: '2' },
  ];

  const postsSchema = makeExecutableSchema({
    typeDefs: `
      type Post {
        id: ID!
        productDealId: ID
        restaurantId: ID
      }

      type Query {
        post(id: ID!): Post
      }
    `,
    resolvers: {
      Query: {
        post: (root, { id }) => posts.find(post => post.id === id),
      }
    }
  });

  const metadataSchema = makeExecutableSchema({
    typeDefs: `
      type ProductDeal {
        id: ID!
      }
      type Restaurant {
        id: ID!
      }

      type Post {
        id: ID!
        productDeal: ProductDeal
        restaurant: Restaurant
      }

      input PostInput {
        id: ID!
        productDealId: ID
        restaurantId: ID
      }

      type Query {
        _posts(representations: [PostInput!]!): [Post]!
      }
    `,
    resolvers: {
      Query: {
        _posts: (root, { representations }) => {
          metadataRequests += 1;
          return representations.map(({ id, productDealId, restaurantId }) => ({
            id,
            productDeal: productDealId ? { id: productDealId } : null,
            restaurant: restaurantId ? { id: restaurantId } : null,
          }));
        },
      }
    }
  });

  const getGatewaySchema = (eagerReturn): GraphQLSchema => stitchSchemas({
    subschemas: [
      {
        schema: postsSchema,
        merge: {
          Post: {
            selectionSet: '{ id }',
            fieldName: 'post',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema: metadataSchema,
        merge: {
          Post: {
            selectionSet: '{ id }',
            fields: {
              productDeal: { selectionSet: '{ productDealId }' },
              restaurant: { selectionSet: '{ restaurantId }' },
            },
            fieldName: '_posts',
            key: ({ id, productDealId, restaurantId }) => ({ id, productDealId, restaurantId }),
            argsFromKeys: (representations) => ({ representations }),
            eagerReturn,
          },
        },
      },
    ],
    mergeTypes: true
  });

  beforeEach(() => {
    metadataRequests = 0;
  });

  it('allows early return for empty keys', async () => {
    const eagerReturn = (key) => null;

    const result = await graphql(getGatewaySchema(eagerReturn), `
      query {
        post(id: 1) {
          id
          productDeal {
            id
          }
          restaurant {
            id
          }
        }
      }
    `);

    expect(metadataRequests).toEqual(0);
    expect(result.data.post).toEqual({
      id: '1',
      productDeal: null,
      restaurant: null,
    });
  });

  it('allows early return with custom result', async () => {
    const eagerReturn = (key) => ({ id: key.id, restaurant: { id: '55' } });

    const result = await graphql(getGatewaySchema(eagerReturn), `
      query {
        post(id: 1) {
          id
          productDeal {
            id
          }
          restaurant {
            id
          }
        }
      }
    `);

    expect(metadataRequests).toEqual(0);
    expect(result.data.post).toEqual({
      id: '1',
      productDeal: null,
      restaurant: {
        id: '55',
      },
    });
  });

  it('requests as normal when eagerReturn is undefined', async () => {
    const eagerReturn = (key) => undefined;

    const result = await graphql(getGatewaySchema(eagerReturn), `
      query {
        post(id: 2) {
          id
          productDeal {
            id
          }
          restaurant {
            id
          }
        }
      }
    `);

    expect(metadataRequests).toEqual(1);
    expect(result.data.post).toEqual({
      id: '2',
      productDeal: null,
      restaurant: {
        id: '2',
      },
    });
  });
});