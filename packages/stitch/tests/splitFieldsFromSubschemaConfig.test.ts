import { makeExecutableSchema } from '@graphql-tools/schema';
import { splitFieldsFromSubschemaConfig, applyComputationsFromSDL } from '@graphql-tools/stitch';

describe('splitFieldsFromSubschemaConfig', () => {
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
      const [computedConfig, staticConfig] = splitFieldsFromSubschemaConfig({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              shippingEstimate: { selectionSet: '{ price weight }', isolate: true },
              deliveryService: { selectionSet: '{ weight }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
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
      const subschemas = splitFieldsFromSubschemaConfig({
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
      });

      expect(subschemas.length).toEqual(1);
      expect(subschemas[0].merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }' },
        deliveryService: { selectionSet: '{ weight }' },
      });
    });
  });

  describe('from SDL directives', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        directive @requires(selectionSet: String) on FIELD_DEFINITION
        type Product {
          id: ID!
          shippingEstimate: Float! @requires(selectionSet: "{ price weight }")
          deliveryService: DeliveryService! @requires(selectionSet: "{ weight }")
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
      const [computedConfig, staticConfig] = splitFieldsFromSubschemaConfig(applyComputationsFromSDL({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      }));

      const productFields = computedConfig.schema.getType('Product').getFields();
      expect(Object.keys(productFields)).toEqual(['shippingEstimate', 'deliveryService']);
      expect(productFields.shippingEstimate).toBeDefined();
      expect(productFields.shippingEstimate.deprecationReason).toBeUndefined();
      expect(productFields.deliveryService).toBeDefined();
      expect(productFields.deliveryService.deprecationReason).toBeUndefined();
      expect(computedConfig.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }' },
        deliveryService: { selectionSet: '{ weight }' },
      });

      expect(Object.keys(staticConfig.schema.getType('Product').getFields())).toEqual(['id']);
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
      const subschemas = splitFieldsFromSubschemaConfig({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              computedOne: { selectionSet: '{ price weight }', isolate: true },
              computedTwo: { selectionSet: '{ weight }', isolate: true },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
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
      const [computedConfig, staticConfig] = splitFieldsFromSubschemaConfig({
        schema: storefrontSchema,
        merge: {
          Storefront: {
            selectionSet: '{ id }',
            fields: {
              computed: { selectionSet: '{ availableProductIds }', isolate: true },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id }',
            fields: {
              computed: { selectionSet: '{ price weight }', isolate: true },
              static: { selectionSet: '{ weight }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
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

      const [computedConfig, staticConfig] = splitFieldsFromSubschemaConfig({
        schema: testSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              computed: { selectionSet: '{ price weight }', isolate: true }
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      expect(Object.keys(computedConfig.schema.getType('IProduct').getFields())).toEqual(['computed']);
      expect(Object.keys(computedConfig.schema.getType('Product').getFields())).toEqual(['computed']);
      expect(Object.keys(staticConfig.schema.getType('IProduct').getFields())).toEqual(['static']);
      expect(Object.keys(staticConfig.schema.getType('Product').getFields())).toEqual(['static']);
    });
  });
});
