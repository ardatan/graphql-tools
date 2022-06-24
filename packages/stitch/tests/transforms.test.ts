import { graphql, assertValidSchema } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema, RenameRootTypes, FilterObjectFields } from '@graphql-tools/wrap';
import { addMocksToSchema } from '@graphql-tools/mock';

import { stitchSchemas } from '../src/stitchSchemas.js';

import { propertySchema } from '../../testing/fixtures/schemas.js';

describe('rename root type', () => {
  test('works with stitchSchemas', async () => {
    let schemaWithCustomRootTypeNames = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
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
      typeDefs: /* GraphQL */ `
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
          transforms: [new RenameRootTypes(name => `${name}Root`)],
        },
      ],
      typeDefs: /* GraphQL */ `
        schema {
          query: QueryRoot
          mutation: MutationRoot
        }
      `,
    });

    const result = await graphql({
      schema: stitchedSchema,
      source: /* GraphQL */ `
        mutation {
          doSomething {
            query {
              foo
              bar
            }
          }
        }
      `,
    });

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
    const filteredSchema = wrapSchema({
      schema: propertySchema,
      transforms: [new FilterObjectFields((typeName, fieldName) => `${typeName}.${fieldName}` !== 'Property.location')],
    });

    assertValidSchema(filteredSchema);

    const stitchedSchema = stitchSchemas({
      subschemas: [filteredSchema],
      typeDefs: /* GraphQL */ `
        extend type Property {
          location: Location
        }
      `,
    });

    assertValidSchema(stitchedSchema);
  });
});
