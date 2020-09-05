import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas, ComputedFieldsPlugin } from '@graphql-tools/stitch';
import { graphql } from 'graphql';

describe('isolateComputedMergeSchemas', () => {
  const plugin = new ComputedFieldsPlugin();

  describe('basic isolation', () => {
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
      `
    });

    it('splits a subschema into static and dynamic portions', async () => {
      const { subschemas: [computedConfig, staticConfig] } = plugin.preconfigure({
        subschemas: [{
          schema: storefrontSchema,
          merge: {
            Product: {
              selectionSet: '{ id }',
              fields: {
                shippingEstimate: { selectionSet: '{ price weight }', computed: true },
                deliveryService: { selectionSet: '{ weight }' },
              },
              fieldName: '_products',
              key: ({ id, price, weight }) => ({ id, price, weight }),
              argsFromKeys: (representations) => ({ representations }),
            }
          }
        }]
      });

      expect(Object.keys(computedConfig.schema.getType('Query').getFields())).toEqual(['_products']);
      expect(Object.keys(computedConfig.schema.getType('Product').getFields())).toEqual(['shippingEstimate']);
      expect(computedConfig.schema.getType('DeliveryService')).toBeUndefined();
      expect(computedConfig.schema.getType('Storefront')).toBeUndefined();
      expect(computedConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(computedConfig.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }' },
      });

      expect(Object.keys(staticConfig.schema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticConfig.schema.getType('Product').getFields())).toEqual(['id', 'deliveryService']);
      expect(staticConfig.schema.getType('DeliveryService')).toBeDefined();
      expect(staticConfig.schema.getType('Storefront')).toBeDefined();
      expect(staticConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(staticConfig.merge.Product.fields).toEqual({
        deliveryService: { selectionSet: '{ weight }' },
      });
    });

    it('does not split schemas with only optional fields', async () => {
      const { subschemas } = plugin.preconfigure({
        subschemas: [{
          schema: storefrontSchema,
          merge: {
            Product: {
              selectionSet: '{ id }',
              fields: {
                shippingEstimate: { selectionSet: '{ price weight }' },
                deliveryService: { selectionSet: '{ weight }' },
              },
              fieldName: '_products',
              key: ({ id, price, weight }) => ({ id, price, weight }),
              argsFromKeys: (representations) => ({ representations }),
            }
          }
        }]
      });

      expect(subschemas.length).toEqual(1);
      expect(subschemas[0].merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }' },
        deliveryService: { selectionSet: '{ weight }' },
      });
    });
  });

  describe('fully computed type', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        type Product {
          computedOne: String!
          computedTwo: String!
        }
        type Query {
          _products(representations: [ID!]!): [Product]!
        }
      `
    });

    it('does not reprocess already isolated computations', async () => {
      const { subschemas } = plugin.preconfigure({
        subschemas: [{
          schema: storefrontSchema,
          merge: {
            Product: {
              selectionSet: '{ id }',
              fields: {
                computedOne: { selectionSet: '{ price weight }', computed: true },
                computedTwo: { selectionSet: '{ weight }', computed: true },
              },
              fieldName: '_products',
              key: ({ id, price, weight }) => ({ id, price, weight }),
              argsFromKeys: (representations) => ({ representations }),
            }
          }
        }]
      });

      expect(subschemas.length).toEqual(1);
    });
  });

  describe('multiple computed types', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        type Product {
          static: String!
          computed: String!
        }
        type Storefront {
          static: ID!
          computed: [Product]!
        }
        type Query {
          storefront(id: ID!): Storefront
          _products(representations: [ID!]!): [Product]!
        }
      `
    });

    it('moves all dynamic types to the dynamic schema', async () => {
      const { subschemas: [computedConfig, staticConfig] } = plugin.preconfigure({
        subschemas: [{
          schema: storefrontSchema,
          merge: {
            Storefront: {
              selectionSet: '{ id }',
              fields: {
                computed: { selectionSet: '{ availableProductIds }', computed: true },
              },
              fieldName: 'storefront',
              args: ({ id }) => ({ id }),
            },
            Product: {
              selectionSet: '{ id }',
              fields: {
                computed: { selectionSet: '{ price weight }', computed: true },
                static: { selectionSet: '{ weight }' },
              },
              fieldName: '_products',
              key: ({ id, price, weight }) => ({ id, price, weight }),
              argsFromKeys: (representations) => ({ representations }),
            }
          }
        }]
      });

      expect(Object.keys(computedConfig.schema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(computedConfig.schema.getType('Product').getFields())).toEqual(['computed']);
      expect(Object.keys(computedConfig.schema.getType('Storefront').getFields())).toEqual(['computed']);
      expect(computedConfig.merge.Storefront.fields).toEqual({
        computed: { selectionSet: '{ availableProductIds }' },
      });
      expect(computedConfig.merge.Product.fields).toEqual({
        computed: { selectionSet: '{ price weight }' },
      });

      expect(Object.keys(staticConfig.schema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticConfig.schema.getType('Product').getFields())).toEqual(['static']);
      expect(Object.keys(staticConfig.schema.getType('Storefront').getFields())).toEqual(['static']);
      expect(staticConfig.merge.Storefront.fields).toBeUndefined();
      expect(staticConfig.merge.Product.fields).toEqual({
        static: { selectionSet: '{ weight }' },
      });
    });
  });

  describe('with computed interface fields', () => {
    it('shifts computed interface fields into computed schema', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: `
          interface IProduct {
            static: String!
            computed: String!
          }
          type Product implements IProduct {
            static: String!
            computed: String!
          }
          type Query {
            _products(representations: [ID!]!): [Product]!
          }
        `
      });

      const { subschemas: [computedConfig, staticConfig] } = plugin.preconfigure({
        subschemas: [{
          schema: testSchema,
          merge: {
            Product: {
              selectionSet: '{ id }',
              fields: {
                computed: { selectionSet: '{ price weight }', computed: true }
              },
              fieldName: '_products',
              key: ({ id, price, weight }) => ({ id, price, weight }),
              argsFromKeys: (representations) => ({ representations }),
            }
          }
        }]
      });

      expect(Object.keys(computedConfig.schema.getType('IProduct').getFields())).toEqual(['computed']);
      expect(Object.keys(computedConfig.schema.getType('Product').getFields())).toEqual(['computed']);
      expect(Object.keys(staticConfig.schema.getType('IProduct').getFields())).toEqual(['static']);
      expect(Object.keys(staticConfig.schema.getType('Product').getFields())).toEqual(['static']);
    });
  });
});

describe('stitched schema integration', () => {
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
        shippingEstimate: (obj) => obj.price > 50 ? 0 : obj.weight / 2,
        deliveryService: (obj) => obj.weight > 50 ? 'FREIGHT' : 'POSTAL',
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
            fields: {
              shippingEstimate: { selectionSet: '{ price weight }', computed: true },
              deliveryService: { selectionSet: '{ weight }', computed: true },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      }
    ],
    mergeTypes: true,
    plugins: [new ComputedFieldsPlugin()]
  });

  it('collects dynamic fields via the gateway', async () => {
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

  it('collects dynamic fields via a subservice', async () => {
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
