import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';

const productSchema = makeExecutableSchema({
  typeDefs: `
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
      product: (root, { id }) => ({ id, price: Number(id) + 0.99, weight: Number(id) }),
    }
  }
});

describe('merge computed fields via config', () => {
  const storefrontSchema = makeExecutableSchema({
    typeDefs: `
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
        storefront: (root, { id }) => ({ id, availableProducts: [{ id: '23' }] }),
        _products: (root, { representations }) => representations,
      },
      Product: {
        shippingEstimate: (obj) => obj.price != null && obj.weight != null ? (obj.price > 50 ? 0 : obj.weight / 2) : null,
        deliveryService: (obj) => obj.weight != null ? (obj.weight > 50 ? 'FREIGHT' : 'POSTAL') : null,
      }
    }
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
          }
        }
      },
      {
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            computedFields: {
              shippingEstimate: { selectionSet: '{ price weight }' },
              deliveryService: { selectionSet: '{ weight }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      }
    ],
  });

  it('can stitch from product service to inventory service', async () => {
    const { data } = await graphql(gatewaySchema, `
      query {
        product(id: 77) {
          id
          price
          weight
          shippingEstimate
          deliveryService
        }
      }
    `);

    expect(data.product).toEqual({
      id: '77',
      price: 77.99,
      weight: 77,
      shippingEstimate: 0,
      deliveryService: 'FREIGHT'
    });
  });

  it('can stitch from inventory service to product service and back to inventory service', async () => {
    const { data } = await graphql(gatewaySchema, `
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
    `);

    expect(data.storefront.availableProducts).toEqual([
      {
        id: '23',
        price: 23.99,
        weight: 23,
        shippingEstimate: 11.5,
        deliveryService: 'POSTAL'
      }
    ]);
  });
});

describe('merge computed fields via SDL (Apollo Federation-style directive annotation)', () => {
  const storefrontSchema = makeExecutableSchema({
    typeDefs: `
      directive @computed(selectionSet: String!) on FIELD_DEFINITION

      type Product {
        id: ID!
        shippingEstimate: Float! @computed(selectionSet: "{ price weight }")
        deliveryService: DeliveryService! @computed(selectionSet: "{ weight }")
      }
      enum DeliveryService {
        POSTAL
        FREIGHT
      }
      type Storefront {
        id: ID!
        availableProducts: [Product]!
      }
      scalar _Any
      union _Entity = Product
      type Query {
        storefront(id: ID!): Storefront
        _entities(representations: [_Any!]!): [_Entity]!
      }
    `,
    resolvers: {
      Query: {
        storefront: (root, { id }) => ({ id, availableProducts: [{ id: '23' }] }),
        _entities: (root, { representations }) => representations,
      },
      Product: {
        shippingEstimate: (obj) => obj.price != null && obj.weight != null ? (obj.price > 50 ? 0 : obj.weight / 2) : null,
        deliveryService: (obj) => obj.weight != null ? (obj.weight > 50 ? 'FREIGHT' : 'POSTAL') : null,
      }
    }
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
          }
        }
      },
      {
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: '_entities',
            key: ({ id, price, weight }) => ({ id, price, weight, __typename: 'Product' }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      },
    ],
  });

  it('can stitch from inventory service to product service and back to inventory service', async () => {
    const { data } = await graphql(gatewaySchema, `
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
    `);

    expect(data.storefront.availableProducts).toEqual([
      {
        id: '23',
        price: 23.99,
        weight: 23,
        shippingEstimate: 11.5,
        deliveryService: 'POSTAL'
      }
    ]);
  });
});
