import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateFederatedFields } from '@graphql-tools/stitch';
import { Subschema } from '@graphql-tools/delegate';

describe('isolateFederatedFields', () => {
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

    it('splits a subschema into non-federated and federated portions', async () => {
      const [nonFederatedConfig, federatedConfig] = isolateFederatedFields({
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

      const nonFederatedSubschema = new Subschema(nonFederatedConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id', 'deliveryService']);
      expect(nonFederatedSubschema.transformedSchema.getType('DeliveryService')).toBeDefined();
      expect(nonFederatedSubschema.transformedSchema.getType('Storefront')).toBeDefined();
      expect(nonFederatedSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

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

    it('does not split schemas with only non-federated fields', async () => {
      const subschemas = isolateFederatedFields({
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

    it('splits a subschema into non-federated and federated portions', async () => {
      const [nonFederatedConfig, federatedConfig] = isolateFederatedFields(new Subschema({
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

      const nonFederatedSubschema = new Subschema(nonFederatedConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['id']);

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
      const subschemas = isolateFederatedFields({
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
          nonFederated: String!
          federated: String!
        }
        type Storefront {
          nonFederated: ID!
          federated: [Product]!
        }
        type Query {
          storefront(id: ID!): Storefront
          _products(representations: [ID!]!): [Product]!
        }
      `
    });

    it('moves all federated types to the federated schema', async () => {
      const [nonFederatedConfig, federatedConfig] = isolateFederatedFields({
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

      const nonFederatedSubschema = new Subschema(nonFederatedConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Query').getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['nonFederated']);
      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Storefront').getFields())).toEqual(['nonFederated']);
      expect(nonFederatedSubschema.merge.Storefront.fields).toBeUndefined();

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
            nonFederated: String!
            federated: String!
          }
          type Product implements IProduct {
            nonFederated: String!
            federated: String!
          }
          type Query {
            _products(representations: [ID!]!): [Product]!
          }
        `
      });

      const [nonFederatedConfig, federatedConfig] = isolateFederatedFields({
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

      const nonFederatedSubschema = new Subschema(nonFederatedConfig);
      const federatedSubschema = new Subschema(federatedConfig);

      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['nonFederated']);
      expect(Object.keys(nonFederatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['nonFederated']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('IProduct').getFields())).toEqual(['federated']);
      expect(Object.keys(federatedSubschema.transformedSchema.getType('Product').getFields())).toEqual(['federated']);
    });
  });
});
