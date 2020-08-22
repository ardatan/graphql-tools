import { graphql, assertValidSchema } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  wrapSchema,
  RenameRootTypes,
  FilterObjectFields,
} from '@graphql-tools/wrap';
import { addMocksToSchema } from '@graphql-tools/mock';

import { stitchSchemas } from '../src/stitchSchemas';

import { propertySchema } from './fixtures/schemas';

import {
  RemoveFieldDirectives,
  RemoveFieldsWithDirective
} from '../src/index';


describe('rename root type', () => {
  test('works with stitchSchemas', async () => {
    let schemaWithCustomRootTypeNames = makeExecutableSchema({
      typeDefs: `
        schema {
          query: QueryRoot
          mutation: MutationRoot
        }

        type QueryRoot {
          foo: String!
        }

        type MutationRoot {
          doSomething: DoSomethingPayload!
        }

        type DoSomethingPayload {
          somethingChanged: Boolean!
          query: QueryRoot!
        }
      `,
    });

    schemaWithCustomRootTypeNames = addMocksToSchema({ schema: schemaWithCustomRootTypeNames });

    let schemaWithDefaultRootTypeNames = makeExecutableSchema({
      typeDefs: `
        type Query {
          bar: String!
        }

        type Mutation {
          doSomethingElse: DoSomethingElsePayload!
        }

        type DoSomethingElsePayload {
          somethingElseChanged: Boolean!
          query: Query!
        }
      `,
    });

    schemaWithDefaultRootTypeNames = addMocksToSchema({ schema: schemaWithDefaultRootTypeNames });

    const stitchedSchema = stitchSchemas({
      subschemas: [
        schemaWithCustomRootTypeNames,
        {
          schema: schemaWithDefaultRootTypeNames,
          transforms: [new RenameRootTypes((name) => `${name}Root`)],
        },
      ],
      typeDefs: `
        schema {
          query: QueryRoot
          mutation: MutationRoot
        }
      `,
    });

    const result = await graphql(
      stitchedSchema,
      `
        mutation {
          doSomething {
            query {
              foo
              bar
            }
          }
        }
      `,
    );

    expect(result).toEqual({
      data: {
        doSomething: {
          query: {
            foo: 'Hello World',
            bar: 'Hello World',
          },
        },
      },
    });
  });
});

describe('filter fields', () => {
  // Use case: breaking apart monolithic GQL codebase into microservices.
  // E.g. strip out types/fields from the monolith slowly and re-add them
  // as stitched resolvers to another service.
  it('should allow stitching a previously filtered field onto a type', () => {
    const filteredSchema = wrapSchema(propertySchema, [
      new FilterObjectFields(
        (typeName, fieldName) =>
          `${typeName}.${fieldName}` !== 'Property.location',
      ),
    ]);

    assertValidSchema(filteredSchema);

    const stitchedSchema = stitchSchemas({
      schemas: [
        filteredSchema,
        `
          extend type Property {
            location: Location
          }
        `,
      ],
    });

    assertValidSchema(stitchedSchema);
  });
});

describe('RemoveFieldsWithDirective', () => {
  test('works', async () => {
    const listingsSchema = makeExecutableSchema({
      typeDefs: `
        type Listing {
          id: ID!
          description: String!
          price: Float! @deprecated(reason: "other deprecation")
          sellerId: ID! @deprecated(reason: "stitching use only")
          buyerId: ID  @deprecated(reason: "stitching use only")
        }
      `
    });

    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          schema: listingsSchema,
          transforms: [new RemoveFieldsWithDirective('deprecated', { reason: 'stitching use only' })]
        }
      ],
    });

    expect(listingsSchema.getType('Listing').getFields().price.deprecationReason).toBe('other deprecation');
    expect(listingsSchema.getType('Listing').getFields().sellerId.deprecationReason).toBe('stitching use only');

    expect(stitchedSchema.getType('Listing').getFields().price.deprecationReason).toBe('other deprecation');
    expect(stitchedSchema.getType('Listing').getFields().sellerId).toBeUndefined();
  });
});

describe('RemoveFieldDirectives', () => {
  test('works', async () => {
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

    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          schema: usersSchema,
          transforms: [new RemoveFieldDirectives('deprecated', { reason: 'gateway access only' })]
        },
      ],
    });

    expect(usersSchema.getType('Listing').getFields().seller.deprecationReason).toBe('gateway access only');
    expect(usersSchema.getType('Listing').getFields().seller.astNode.directives.length).toEqual(1);
    expect(stitchedSchema.getType('Listing').getFields().seller.deprecationReason).toBeUndefined();
    expect(stitchedSchema.getType('Listing').getFields().seller.astNode.directives.length).toEqual(0);

    expect(usersSchema.getType('User').getFields().email.deprecationReason).toBe('other deprecation');
    expect(usersSchema.getType('User').getFields().email.astNode.directives.length).toEqual(1);
    expect(stitchedSchema.getType('User').getFields().email.deprecationReason).toBe('other deprecation');
    expect(stitchedSchema.getType('User').getFields().email.astNode.directives.length).toEqual(1);
  });
});