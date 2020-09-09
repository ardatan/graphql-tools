import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateFieldsFromSubschema } from '@graphql-tools/stitch';
import { Subschema } from '@graphql-tools/delegate';

describe('isolateFieldsFromSubschema', () => {
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

    it('splits a subschema into static and computed portions', async () => {
      const [staticConfig, computedConfig] = isolateFieldsFromSubschema({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              shippingEstimate: { selectionSet: '{ price }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const staticSubschema = new Subschema(staticConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id', 'deliveryService']);
      expect(staticSubschema.transformedSchema.getType('DeliveryService')).toBeDefined();
      expect(staticSubschema.transformedSchema.getType('Storefront')).toBeDefined();
      expect(staticSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      expect(Object.keys(computedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['_products']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['shippingEstimate']);

      // pruning does not yet remove unused scalars/enums
      // expect(computedSubschema.transformedSchema.getType('DeliveryService')).toBeUndefined();
      expect(computedSubschema.transformedSchema.getType('Storefront')).toBeUndefined();
      expect(computedSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();
      expect(computedSubschema.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price }' },
      });
    });

    it('does not split schemas with only static fields', async () => {
      const subschemas = isolateFieldsFromSubschema({
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

    it('splits a subschema into static and computed portions', async () => {
      const [staticConfig, computedConfig] = isolateFieldsFromSubschema(new Subschema({
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

      const staticSubschema = new Subschema(staticConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id']);

      const productFields = computedSubschema.transformedSchema.getType('Product').getFields();
      expect(Object.keys(productFields)).toEqual(['shippingEstimate', 'deliveryService']);
      expect(productFields.shippingEstimate).toBeDefined();
      expect(productFields.deliveryService).toBeDefined();
      expect(computedSubschema.merge.Product.fields).toEqual({
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
      const subschemas = isolateFieldsFromSubschema({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
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

    it('moves all computed types to the computed schema', async () => {
      const [staticConfig, computedConfig] = isolateFieldsFromSubschema({
        schema: storefrontSchema,
        merge: {
          Storefront: {
            selectionSet: '{ id }',
            fields: {
              computed: { selectionSet: '{ availableProductIds }' },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              computed: { selectionSet: '{ price }' },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const staticSubschema = new Subschema(staticConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['static']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['static']);
      expect(staticSubschema.merge.Storefront.fields).toBeUndefined();

      expect(Object.keys(computedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['computed']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['computed']);
      expect(computedSubschema.merge.Storefront.fields).toEqual({
        computed: { selectionSet: '{ availableProductIds }' },
      });
      expect(computedSubschema.merge.Product.fields).toEqual({
        computed: { selectionSet: '{ price }' },
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

      const [staticConfig, computedConfig] = isolateFieldsFromSubschema({
        schema: testSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              computed: { selectionSet: '{ price weight }' }
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const staticSubschema = new Subschema(staticConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['static']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['static']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['computed']);
      expect(Object.keys(computedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['computed']);
    });
  });
});
