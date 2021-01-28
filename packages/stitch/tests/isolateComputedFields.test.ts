import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateComputedFields } from '@graphql-tools/stitch';
import { Subschema } from '@graphql-tools/delegate';
import { GraphQLObjectType, GraphQLInterfaceType } from 'graphql';

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
            fields: {
              shippingEstimate: {
                selectionSet: '{ price }',
                computed: true,
                canonical: true,
              },
              deliveryService: {
                canonical: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
            canonical: true,
          }
        }
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys((baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys((baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields())).toEqual(['id', 'deliveryService']);
      expect(baseSubschema.transformedSchema.getType('DeliveryService')).toBeDefined();
      expect(baseSubschema.transformedSchema.getType('Storefront')).toBeDefined();
      expect(baseSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      expect(Object.keys((computedSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields())).toEqual(['_products']);
      expect(Object.keys((computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields())).toEqual(['shippingEstimate']);

      // pruning does not yet remove unused scalars/enums
      // expect(computedSubschema.transformedSchema.getType('DeliveryService')).toBeUndefined();
      expect(Object.keys((computedSubschema.transformedSchema.getType('Storefront') as GraphQLObjectType).getFields()).length).toEqual(0);
      expect(computedSubschema.transformedSchema.getType('ProductRepresentation')).toBeDefined();

      expect(baseSubschema.merge.Product.canonical).toEqual(true);
      expect(baseSubschema.merge.Product.fields).toEqual({
        deliveryService: { canonical: true },
      });

      expect(computedSubschema.merge.Product.canonical).toBeUndefined();
      expect(computedSubschema.merge.Product.fields).toEqual({
        shippingEstimate: { selectionSet: '{ price }', computed: true, canonical: true },
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
            fields: {
              computedOne: {
                selectionSet: '{ price weight }',
                computed: true,
              },
              computedTwo: {
                selectionSet: '{ weight }',
                computed: true,
              },
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
          computeMe: String!
        }
        type Storefront {
          base: ID!
          computeMe: [Product]!
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
            fields: {
              computeMe: {
                selectionSet: '{ availableProductIds }',
                computed: true,
              },
            },
            fieldName: 'storefront',
            args: ({ id }) => ({ id }),
          },
          Product: {
            selectionSet: '{ id weight }',
            fields: {
              computeMe: {
                selectionSet: '{ price }',
                computed: true,
              },
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys((baseSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys((baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields())).toEqual(['base']);
      expect(Object.keys((baseSubschema.transformedSchema.getType('Storefront') as GraphQLObjectType).getFields())).toEqual(['base']);
      expect(baseSubschema.merge.Storefront.fields).toEqual({});

      expect(Object.keys((computedSubschema.transformedSchema.getType('Query') as GraphQLObjectType).getFields())).toEqual(['storefront', '_products']);
      expect(Object.keys((computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields())).toEqual(['computeMe']);
      expect(Object.keys((computedSubschema.transformedSchema.getType('Storefront') as GraphQLObjectType).getFields())).toEqual(['computeMe']);
      expect(computedSubschema.merge.Storefront.fields).toEqual({
        computeMe: { selectionSet: '{ availableProductIds }', computed: true },
      });
      expect(computedSubschema.merge.Product.fields).toEqual({
        computeMe: { selectionSet: '{ price }', computed: true },
      });
    });
  });

  describe('with computed interface fields', () => {
    it('shifts computed interface fields into computed schema', async () => {
      const testSchema = makeExecutableSchema({
        typeDefs: `
          interface IProduct {
            base: String!
            computeMe: String!
          }
          type Product implements IProduct {
            base: String!
            computeMe: String!
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
            fields: {
              computeMe: {
                selectionSet: '{ price weight }',
                computed: true,
              }
            },
            fieldName: '_products',
            key: ({ id, price, weight }) => ({ id, price, weight }),
            argsFromKeys: (representations) => ({ representations }),
          }
        }
      });

      const baseSubschema = new Subschema(baseConfig);
      const computedSubschema = new Subschema(computedConfig);

      expect(Object.keys((baseSubschema.transformedSchema.getType('IProduct') as GraphQLInterfaceType).getFields())).toEqual(['base']);
      expect(Object.keys((baseSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields())).toEqual(['base']);
      expect(Object.keys((computedSubschema.transformedSchema.getType('IProduct') as GraphQLInterfaceType).getFields())).toEqual(['computeMe']);
      expect(Object.keys((computedSubschema.transformedSchema.getType('Product') as GraphQLObjectType).getFields())).toEqual(['computeMe']);
    });
  });
});
