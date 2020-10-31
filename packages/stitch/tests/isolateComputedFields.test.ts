import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateComputedFields } from '@graphql-tools/stitch';
import { Subschema } from '@graphql-tools/delegate';
import { printSchema } from 'graphql';

describe('isolateComputedFields', () => {
  describe('basic isolation', ()    => {
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

    it('splits a subschema into base and computed portions', async () => {
      const [baseConfig, computedConfig] = isolateComputedFields({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id weight }',
            computedFields: {
              shippingEstimate: { selectionSet: '{ price }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(baseSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(baseSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id', 'deliveryService']);
      expect(baseSubschema.transformedSchema.getType('DeliveryService')).toBeDefined();
      expect(baseSubschema.transformedSchema.getType('Storefront')).toBeDefined();
      expect(baseSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      expect(Object.keys(computedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['_products']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['shippingEstimate']);

      // pruning does not yet remove unused scalars/enums
      // expect(computedSubschema.transformedSchema.getType('DeliveryService')).toBeUndefined();
      expect(Object.keys(computedSubschema.transformedSchema.getType('Storefront').getFields()).length).toEqual(0);
      expect(computedSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();
      expect(computedSubschema.merge.Product.computedFields).toEqual({
        shippingEstimate: { selectionSet: '{ price }' },
      });
    });

    it('does not split schemas with only non-computed fields', async () => {
      const subschemas = isolateComputedFields({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id price weight }',
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      expect(subschemas.length).toEqual(1);
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
      const subschemas = isolateComputedFields({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            computedFields: {
              computedOne: { selectionSet: '{ price weight }' },
              computedTwo: { selectionSet: '{ weight }' },
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
          base: String!
          computed: String!
        }
        type Storefront {
          base: ID!
          computed: [Product]!
        }
        type Query {
          storefront(id: ID!): Storefront
          _products(representations: [ID!]!): [Product]!
        }
      `
    });

    it('moves all computed types to the computed schema', async () => {
      const [baseConfig, computedConfig] = isolateComputedFields({
        schema: storefrontSchema,
        merge: {
          Storefront: {
            selectionSet: '{ id }',
            computedFields: {
              computed: { selectionSet: '{ availableProductIds }' },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id weight }',
            computedFields: {
              computed: { selectionSet: '{ price }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(baseSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(baseSubschema.transformedSchema.getType('Product').getFields())).toEqual(['base']);
      expect(Object.keys(baseSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['base']);
      expect(baseSubschema.merge.Storefront.fields).toBeUndefined();

      expect(Object.keys(computedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['computed']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['computed']);
      expect(computedSubschema.merge.Storefront.computedFields).toEqual({
        computed: { selectionSet: '{ availableProductIds }' },
      });
      expect(computedSubschema.merge.Product.computedFields).toEqual({
        computed: { selectionSet: '{ price }' },
      });
    });
  });

  describe('with computed interface fields', () => {
    it('shifts computed interface fields into computed schema', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: `
          interface IProduct {
            base: String!
            computed: String!
          }
          type Product implements IProduct {
            base: String!
            computed: String!
          }
          type Query {
            _products(representations: [ID!]!): [Product]!
          }
        `
      });

      const [baseConfig, computedConfig] = isolateComputedFields({
        schema: testSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            computedFields: {
              computed: { selectionSet: '{ price weight }' }
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(baseSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['base']);
      expect(Object.keys(baseSubschema.transformedSchema.getType('Product').getFields())).toEqual(['base']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['computed']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['computed']);
    });
  });
});
