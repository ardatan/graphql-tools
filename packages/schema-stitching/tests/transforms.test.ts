import { graphql, assertValidSchema } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema-generator';
import {
  wrapSchema,
  RenameRootTypes,
  FilterObjectFields,
} from '@graphql-tools/schema-wrapping';
import { addMocksToSchema } from '@graphql-tools/mocking';

import { stitchSchemas } from '../src/stitchSchemas';

import { propertySchema } from './fixtures/schemas';

describe('rename root type', () => {
  test('works with stitchSchemas', async () => {
    const schemaWithCustomRootTypeNames = makeExecutableSchema({
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

    addMocksToSchema({ schema: schemaWithCustomRootTypeNames });

    const schemaWithDefaultRootTypeNames = makeExecutableSchema({
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

    addMocksToSchema({ schema: schemaWithDefaultRootTypeNames });

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
