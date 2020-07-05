// Conversion of Apollo Federation demo from https://github.com/apollographql/federation-demo.
// See: https://github.com/ardatan/graphql-tools/issues/1697

import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { ExecutionResult } from '@graphql-tools/utils';

import { stitchSchemas } from '../src/stitchSchemas';

describe('merging using type merging', () => {

  const users = [
    {
      id: '1',
      name: 'Ada Lovelace',
      birthDate: '1815-12-10',
      username: '@ada'
    },
    {
      id: '2',
      name: 'Alan Turing',
      birthDate: '1912-06-23',
      username: '@complete',
    },
  ];

  const accountsSchema = makeExecutableSchema({
    typeDefs: `
      type Query {
        me: User
        _userById(id: ID!): User
      }
      type User {
        id: ID!
        name: String
        username: String
      }
    `,
    resolvers: {
      Query: {
        me: () => users[0],
        _userById: (_root, { id }) => users.find(user => user.id === id),
      },
    },
  });

  const inventory = [
    { upc: '1', inStock: true },
    { upc: '2', inStock: false },
    { upc: '3', inStock: true }
  ];

  const inventorySchema = makeExecutableSchema({
    typeDefs: `
      type Product {
        upc: String!
        inStock: Boolean
        shippingEstimate: Int
      }
      type Query {
        _productByUpc(
          upc: String!,
          weight: Int,
          price: Int
        ): Product
      }
    `,
    resolvers: {
      Product: {
        shippingEstimate: product => {
          if (product.price > 1000) {
            return 0 // free for expensive items
          }
          return Math.round(product.weight * 0.5) || null; // estimate is based on weight
        }
      },
      Query: {
        _productByUpc: (_root, { upc, ...fields }) => ({
          ...inventory.find(product => product.upc === upc),
          ...fields
        }),
      },
    },
  });

  const products = [
    {
      upc: '1',
      name: 'Table',
      price: 899,
      weight: 100
    },
    {
      upc: '2',
      name: 'Couch',
      price: 1299,
      weight: 1000
    },
    {
      upc: '3',
      name: 'Chair',
      price: 54,
      weight: 50
    }
  ];

  const productsSchema = makeExecutableSchema({
    typeDefs: `
      type Query {
        topProducts(first: Int = 5): [Product]
        _productByUpc(upc: String!): Product
      }
      type Product {
        upc: String!
        name: String
        price: Int
        weight: Int
      }
    `,
    resolvers: {
      Query: {
        topProducts: (_root, args) => products.slice(0, args.first),
        _productByUpc: (_root, { upc }) => products.find(product => product.upc === upc),
      }
    },
  });

  const usernames = [
    { id: '1', username: '@ada' },
    { id: '2', username: '@complete' },
  ];

  const reviews = [
    {
      id: '1',
      authorId: '1',
      product: { upc: '1' },
      body: 'Love it!',
    },
    {
      id: '2',
      authorId: '1',
      product: { upc: '2' },
      body: 'Too expensive.',
    },
    {
      id: '3',
      authorId: '2',
      product: { upc: '3' },
      body: 'Could be better.',
    },
    {
      id: '4',
      authorId: '2',
      product: { upc: '1' },
      body: 'Prefer something else.',
    },
  ];

  const reviewsSchema = makeExecutableSchema({
    typeDefs: `
      type Review {
        id: ID!
        body: String
        author: User
        product: Product
      }
      type User {
        id: ID!
        username: String
        numberOfReviews: Int
        reviews: [Review]
      }
      type Product {
        upc: String!
        reviews: [Review]
      }
      type Query {
        _userById(id: ID!): User
        _reviewById(id: ID!): Review
        _productByUpc(upc: String!): Product
      }
    `,
    resolvers: {
      Review: {
        author: (review) => ({ __typename: 'User', id: review.authorId }),
      },
      User: {
        reviews: (user) => reviews.filter(review => review.authorId === user.id),
        numberOfReviews: (user) => reviews.filter(review => review.authorId === user.id).length,
        username: (user) => {
          const found = usernames.find(username => username.id === user.id)
          return found ? found.username : null
        },
      },
      Product: {
        reviews: (product) => reviews.filter(review => review.product.upc === product.upc),
      },
      Query: {
        _reviewById: (_root, { id }) => reviews.find(review => review.id === id),
        _userById: (_root, { id }) => ({ id }),
        _productByUpc: (_, { upc }) => ({ upc }),
      },
    }
  });

  const stitchedSchema = stitchSchemas({
    subschemas: [
      {
        schema: accountsSchema,
        merge: {
          User: {
            fieldName: '_userById',
            selectionSet: '{ id }',
            args: ({ id }) => ({ id })
          }
        }
      },
      {
        schema: inventorySchema,
        merge: {
          Product: {
            fieldName: '_productByUpc',
            selectionSet: '{ upc weight price }',
            args: ({ upc, weight, price }) => ({ upc, weight, price }),
          }
        }
      },
      {
        schema: productsSchema,
        merge: {
          Product: {
            fieldName: '_productByUpc',
            selectionSet: '{ upc }',
            args: ({ upc }) => ({ upc }),
          }
        }
      },
      {
        schema: reviewsSchema,
        merge: {
          User: {
            fieldName: '_userById',
            selectionSet: '{ id }',
            args: ({ id }) => ({ id }),
          },
          Product: {
            fieldName: '_productByUpc',
            selectionSet: '{ upc }',
            args: ({ upc }) => ({ upc }),
          },
        }
      }],
    mergeTypes: true,
  });

  test('can stitch from products to inventory schema', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query {
          topProducts {
            upc
            shippingEstimate
          }
        }
      `,
    );

    const expectedResult = {
      data: {
        topProducts: [
          { shippingEstimate: 50, upc: '1' },
          { shippingEstimate: 0, upc: '2' },
          { shippingEstimate: 25, upc: '3' },
        ],
      },
    };

    expect(result).toEqual(expectedResult);
  });

  test('can stitch from accounts to reviews to products to inventory', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query {
          me {
            reviews {
              product {
                upc
                price
                weight
              }
            }
          }
        }
      `,
    );

    const expectedResult: ExecutionResult = {
      data: {
        me: {
          reviews: [
            { product: { price: 899, upc: '1', weight: 100 } },
            { product: { price: 1299, upc: '2', weight: 1000 } },
          ],
        }
      },
    };

    expect(result).toEqual(expectedResult);
  });

  test('can stitch from accounts to reviews to products to inventory', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query {
          me {
            reviews {
              product {
                upc
                price
                weight
                shippingEstimate
              }
            }
          }
        }
      `,
    );

    const expectedResult: ExecutionResult = {
      data: {
        me: {
          reviews: [
            {
              product: {
                price: 899,
                upc: '1',
                weight: 100,
                shippingEstimate: 50,
              },
            },
            {
              product: {
                price: 1299,
                upc: '2',
                weight: 1000,
                shippingEstimate: 0,
              }
            },
          ],
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });

  test('can stitch from accounts to reviews to products to inventory even when entire key not requested', async () => {
    const result = await graphql(
      stitchedSchema,
      `
        query {
          me {
            reviews {
              product {
                upc
                shippingEstimate
              }
            }
          }
        }
      `,
    );

    const expectedResult: ExecutionResult = {
      data: {
        me: {
          reviews: [
            {
              product: {
                upc: '1',
                shippingEstimate: 50,
              },
            },
            {
              product: {
                upc: '2',
                shippingEstimate: 0,
              }
            },
          ],
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});
