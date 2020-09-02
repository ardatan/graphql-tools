import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateDynamicMergeSchemas } from '../src/isolateDynamicMergeSchemas';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('isolateDynamicMergeSchemas', () => {
  describe('basic splitting', () => {
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
      const [dynamicConfig, staticConfig] = isolateDynamicMergeSchemas([{
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              shippingEstimate: { selectionSet: '{ price weight }', required: true },
              deliveryService: { selectionSet: '{ weight }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      }]);

      expect(Object.keys(dynamicConfig.schema.getType('Query').getFields())).toEqual(['_products']);
      expect(Object.keys(dynamicConfig.schema.getType('Product').getFields())).toEqual(['shippingEstimate']);
      expect(dynamicConfig.schema.getType('DeliveryService')).toBeUndefined();
      expect(dynamicConfig.schema.getType('Storefront')).toBeUndefined();
      expect(dynamicConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(dynamicConfig.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }', required: true },
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
      const results = isolateDynamicMergeSchemas([{
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
      }]);

      expect(results.length).toEqual(1);
      expect(results[0].merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }' },
        deliveryService: { selectionSet: '{ weight }' },
      });
    });
  });

  describe('fully dynamic type', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        type Product {
          shippingEstimate: Float!
          deliveryService: String!
        }

        input ProductRepresentation {
          id: ID!
          price: Float
          weight: Int
        }

        type Query {
          _products(representations: [ProductRepresentation!]!): [Product]!
        }
      `
    });

    it('moves everything to the dynamic schema', async () => {
      const [dynamicConfig, staticConfig] = isolateDynamicMergeSchemas([{
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              shippingEstimate: { selectionSet: '{ price weight }', required: true },
              deliveryService: { selectionSet: '{ weight }', required: true },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      }]);

      expect(dynamicConfig.schema.getType('Product')).toBeDefined();
      expect(dynamicConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(dynamicConfig.schema.getType('Query')).toBeDefined();
      expect(dynamicConfig.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }', required: true },
        deliveryService: { selectionSet: '{ weight }', required: true },
      });

      expect(staticConfig.schema.getType('Product')).toBeUndefined();
      expect(staticConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(staticConfig.schema.getType('Query')).toBeUndefined();
      expect(staticConfig.merge).toBeUndefined();
    });
  });

  describe('multiple types', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        type Product {
          shippingEstimate: Float!
          deliveryService: String!
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

    it('moves all dynamic types to the dynamic schema', async () => {
      const [dynamicConfig, staticConfig] = isolateDynamicMergeSchemas([{
        schema: storefrontSchema,
        merge: {
          Storefront: {
            selectionSet: '{ id }',
            fields: {
              availableProducts: { selectionSet: '{ availableProductIds }', required: true },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id }',
            fields: {
              shippingEstimate: { selectionSet: '{ price weight }', required: true },
              deliveryService: { selectionSet: '{ weight }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      }]);

      expect(Object.keys(dynamicConfig.schema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(dynamicConfig.schema.getType('Product').getFields())).toEqual(['shippingEstimate']);
      expect(Object.keys(dynamicConfig.schema.getType('Storefront').getFields())).toEqual(['availableProducts']);
      expect(dynamicConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(dynamicConfig.merge.Storefront.fields).toEqual({
        availableProducts: { selectionSet: '{ availableProductIds }', required: true },
      });
      expect(dynamicConfig.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }', required: true },
      });

      expect(Object.keys(staticConfig.schema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticConfig.schema.getType('Product').getFields())).toEqual(['deliveryService']);
      expect(Object.keys(staticConfig.schema.getType('Storefront').getFields())).toEqual(['id']);
      expect(staticConfig.schema.getType('ProductRepresentation')).toBeDefined();
      expect(staticConfig.merge.Storefront.fields).toBeUndefined();
      expect(staticConfig.merge.Product.fields).toEqual({
        deliveryService: { selectionSet: '{ weight }' },
      });
    });
  });
});
