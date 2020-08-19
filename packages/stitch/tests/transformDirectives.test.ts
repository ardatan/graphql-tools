import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas';
import { RemoveDirectives, RemoveDirectiveFields } from '../src/index';

describe('transform deprecations', () => {
  test('removes specific deprecations and deprecated fields from the gateway schema', async () => {
    const listingsSchema = makeExecutableSchema({
      typeDefs: `
        type Listing {
          id: ID!
          description: String!
          price: Float!
          sellerId: ID! @deprecated(reason: "stitching use only")
          buyerId: ID  @deprecated(reason: "stitching use only")
        }
      `
    });

    const usersSchema = makeExecutableSchema({
      typeDefs: `
        type User {
          id: ID!
          email: String! @deprecated(reason: "other deprecation")
        }

        input List {
          thing: String
        }
        type Listing {
          seller: User! @deprecated(reason: "gateway access only")
          buyer: User @deprecated(reason: "gateway access only")
        }
      `
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: listingsSchema,
          transforms: [new RemoveDirectiveFields('deprecated', { reason: 'gateway access only' })]
        },
        {
          schema: usersSchema,
          transforms: [new RemoveDirectives('deprecated', { reason: 'gateway access only' })]
        },
      ],
    });

    expect(listingsSchema.getType('Listing').getFields().sellerId.deprecationReason).toBe('stitching use only');
    expect(gatewaySchema.getType('Listing').getFields().sellerId).toBe(undefined);

    expect(usersSchema.getType('Listing').getFields().seller.deprecationReason).toBe('gateway access only');
    expect(gatewaySchema.getType('Listing').getFields().seller.deprecationReason).toBe(undefined);

    expect(usersSchema.getType('User').getFields().email.deprecationReason).toBe('other deprecation');
    expect(gatewaySchema.getType('User').getFields().email.deprecationReason).toBe('other deprecation');
  });
});
