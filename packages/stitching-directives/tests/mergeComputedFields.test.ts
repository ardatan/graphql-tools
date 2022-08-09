import { assertSome } from '@graphql-tools/utils';
import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '../src';

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

describe('merge computed fields via SDL (Apollo Federation-style directive annotation)', () => {
  const storefrontSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
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
        storefront: (_root, { id }) => ({ id, availableProducts: [{ id: '23' }] }),
        _entities: (_root, { representations }) => representations,
      },
      Product: {
        shippingEstimate: obj =>
          obj.price != null && obj.weight != null ? (obj.price > 50 ? 0 : obj.weight / 2) : null,
        deliveryService: obj => (obj.weight != null ? (obj.weight > 50 ? 'FREIGHT' : 'POSTAL') : null),
      },
    },
  });

  const { stitchingDirectivesTransformer } = stitchingDirectives();
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
            fieldName: '_entities',
            key: ({ id, price, weight }) => ({ id, price, weight, __typename: 'Product' }),
            argsFromKeys: representations => ({ representations }),
          },
        },
      },
    ],
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
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
