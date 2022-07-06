import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

const productSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Product {
      id: ID!
      price: Float!
      weight: Int!
    }

    type Query {
      product(id: ID!): Product
    }
  `,
  resolvers: {
    Query: {
      product: (_root, { id }) => ({ id, price: Number(id) + 0.99, weight: Number(id) }),
    },
  },
});

describe('merge computed fields via config', () => {
  const storefrontSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Product {
        id: ID!
        shippingEstimate: Float!
        deliveryService: DeliveryService!
      }
      enum DeliveryService {
        POSTAL
        FREIGHT
      }
      type Storefront {
        id: ID!
        availableProducts: [Product]!
      }
      input ProductRepresentation {
        id: ID!
        price: Float
        weight: Int
      }
      type Query {
        storefront(id: ID!): Storefront
        _products(representations: [ProductRepresentation!]!): [Product]!
      }
    `,
    resolvers: {
      Query: {
        storefront: (_root, { id }) => ({ id, availableProducts: [{ id: '23' }] }),
        _products: (_root, { representations }) => representations,
      },
      Product: {
        shippingEstimate: obj =>
          obj.price != null && obj.weight != null ? (obj.price > 50 ? 0 : obj.weight / 2) : null,
        deliveryService: obj => (obj.weight != null ? (obj.weight > 50 ? 'FREIGHT' : 'POSTAL') : null),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: productSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'product',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              shippingEstimate: {
                selectionSet: '{ price weight }',
                computed: true,
              },
              deliveryService: {
                selectionSet: '{ weight }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      },
    ],
  });

  it('can stitch from product service to inventory service', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          product(id: 77) {
            id
            price
            weight
            shippingEstimate
            deliveryService
          }
        }
      `,
    });

    assertSome(data);
    expect(data['product']).toEqual({
      id: '77',
      price: 77.99,
      weight: 77,
      shippingEstimate: 0,
      deliveryService: 'FREIGHT',
    });
  });

  it('can stitch from inventory service to product service and back to inventory service', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          storefront(id: 77) {
            availableProducts {
              id
              price
              weight
              shippingEstimate
              deliveryService
            }
          }
        }
      `,
    });

    assertSome(data);
    const storeFrontData: any = data['storefront'];
    expect(storeFrontData.availableProducts).toEqual([
      {
        id: '23',
        price: 23.99,
        weight: 23,
        shippingEstimate: 11.5,
        deliveryService: 'POSTAL',
      },
    ]);
  });
});
