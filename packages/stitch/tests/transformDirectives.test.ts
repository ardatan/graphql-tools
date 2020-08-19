import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas';
import { RemoveDirectives, RemoveFieldsWithDirective } from '../src/index';

describe('transform deprecations', () => {
  test('removes directives with arguments, includes deprecations', async () => {
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
          transforms: [new RemoveFieldsWithDirective('deprecated', { reason: 'gateway access only' })]
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
    expect(usersSchema.getType('Listing').getFields().seller.astNode.directives.length).toEqual(1);
    expect(gatewaySchema.getType('Listing').getFields().seller.deprecationReason).toBe(undefined);
    expect(gatewaySchema.getType('Listing').getFields().seller.astNode.directives.length).toEqual(0);

    expect(usersSchema.getType('User').getFields().email.deprecationReason).toBe('other deprecation');
    expect(usersSchema.getType('User').getFields().email.astNode.directives.length).toEqual(1);
    expect(gatewaySchema.getType('User').getFields().email.deprecationReason).toBe('other deprecation');
    expect(gatewaySchema.getType('User').getFields().email.astNode.directives.length).toEqual(1);
  });
});
