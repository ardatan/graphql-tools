import { makeExecutableSchema } from '@graphql-tools/schema';
import { isolateDynamicMergeSchemas } from '../src/isolateDynamicMergeSchemas';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('isolateDynamicMergeSchemas', () => {
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
    const [staticConfig, dynamicConfig] = isolateDynamicMergeSchemas([{
      schema: storefrontSchema,
      merge: {
        Product: {
          selectionSet: '{ id }',
          fields: {
            shippingEstimate: { selectionSet: '{ price weight }' },
            deliveryService: { selectionSet: '{ weight }', optional: true },
          },
          fieldName: '_products',
          key: ({ id, price, weight }) => ({ id, price, weight }),
          argsFromKeys: (representations) => ({ representations }),
        }
      }
    }]);

    //console.log(printSchemaWithDirectives(dynamicConfig.schema));

    expect(staticConfig.merge.Product.fields).toEqual({
      deliveryService: { selectionSet: '{ weight }', optional: true },
    });

    expect(dynamicConfig.merge.Product.fields).toEqual({
      shippingEstimate: { selectionSet: '{ price weight }' },
    });
  });

  it('splits a subschema into a single static portion', async () => {
    const [staticConfig, dynamicConfig] = isolateDynamicMergeSchemas([{
      schema: storefrontSchema,
      merge: {
        Product: {
          selectionSet: '{ id }',
          fields: {
            shippingEstimate: { selectionSet: '{ price weight }', optional: true },
            deliveryService: { selectionSet: '{ weight }', optional: true },
          },
          fieldName: '_products',
          key: ({ id, price, weight }) => ({ id, price, weight }),
          argsFromKeys: (representations) => ({ representations }),
        }
      }
    }]);

    expect(staticConfig.merge.Product.fields).toEqual({
      shippingEstimate: { selectionSet: '{ price weight }', optional: true },
      deliveryService: { selectionSet: '{ weight }', optional: true },
    });

    expect(dynamicConfig).toBeUndefined();
  });
});
