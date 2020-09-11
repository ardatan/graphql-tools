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

    it('splits a subschema into static and federated portions', async () => {
      const [staticConfig, federatedConfig] = isolateFieldsFromSubschema({
        schema: storefrontSchema,
        merge: {
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              shippingEstimate: { selectionSet: '{ price }', federate: true },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const staticSubschema = new Subschema(staticConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id', 'deliveryService']);
      expect(staticSubschema.transformedSchema.getType('DeliveryService')).toBeDefined();
      expect(staticSubschema.transformedSchema.getType('Storefront')).toBeDefined();
      expect(staticSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      expect(Object.keys(federatedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['_products']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['shippingEstimate']);

      // pruning does not yet remove unused scalars/enums
      // expect(federatedSubschema.transformedSchema.getType('DeliveryService')).toBeUndefined();
      expect(federatedSubschema.transformedSchema.getType('Storefront')).toBeUndefined();
      expect(federatedSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();
      expect(federatedSubschema.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price }', federate: true },
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
        directive @requires(selectionSet: String!, federate: Boolean = true) on FIELD_DEFINITION
        type Product {
          id: ID!
          shippingEstimate: Float! @requires(selectionSet: "{ price weight }", federate: true)
          deliveryService: DeliveryService! @requires(selectionSet: "{ weight }", federate: true)
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

    it('splits a subschema into static and federated portions', async () => {
      const [staticConfig, federatedConfig] = isolateFieldsFromSubschema(new Subschema({
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
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id']);

      const productFields = federatedSubschema.transformedSchema.getType('Product').getFields();
      expect(Object.keys(productFields)).toEqual(['shippingEstimate', 'deliveryService']);
      expect(productFields.shippingEstimate).toBeDefined();
      expect(productFields.deliveryService).toBeDefined();
      expect(federatedSubschema.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price weight }', federate: true },
        deliveryService: { selectionSet: '{ weight }', federate: true },
      });
    });
  });

  describe('fully federated type', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        type Product {
          federatedOne: String!
          federatedTwo: String!
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
              federatedOne: { selectionSet: '{ price weight }', federate: true },
              federatedTwo: { selectionSet: '{ weight }', federate: true },
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

  describe('multiple federated types', () => {
    const storefrontSchema = makeExecutableSchema({
      typeDefs: `
        type Product {
          static: String!
          federated: String!
        }
        type Storefront {
          static: ID!
          federated: [Product]!
        }
        type Query {
          storefront(id: ID!): Storefront
          _products(representations: [ID!]!): [Product]!
        }
      `
    });

    it('moves all federated types to the federated schema', async () => {
      const [staticConfig, federatedConfig] = isolateFieldsFromSubschema({
        schema: storefrontSchema,
        merge: {
          Storefront: {
            selectionSet: '{ id }',
            fields: {
              federated: { selectionSet: '{ availableProductIds }', federate: true },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              federated: { selectionSet: '{ price }', federate: true },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const staticSubschema = new Subschema(staticConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['static']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['static']);
      expect(staticSubschema.merge.Storefront.fields).toBeUndefined();

      expect(Object.keys(federatedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['federated']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['federated']);
      expect(federatedSubschema.merge.Storefront.fields).toEqual({
        federated: { selectionSet: '{ availableProductIds }', federate: true },
      });
      expect(federatedSubschema.merge.Product.fields).toEqual({
        federated: { selectionSet: '{ price }', federate: true },
      });
    });
  });

  describe('with federated interface fields', () => {
    it('shifts federated interface fields into federated schema', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: `
          interface IProduct {
            static: String!
            federated: String!
          }
          type Product implements IProduct {
            static: String!
            federated: String!
          }
          type Query {
            _products(representations: [ID!]!): [Product]!
          }
        `
      });

      const [staticConfig, federatedConfig] = isolateFieldsFromSubschema({
        schema: testSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fields: {
              federated: { selectionSet: '{ price weight }', federate: true }
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const staticSubschema = new Subschema(staticConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(staticSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['static']);
      expect(Object.keys(staticSubschema.transformedSchema.getType('Product').getFields())).toEqual(['static']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['federated']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['federated']);
    });
  });
});
