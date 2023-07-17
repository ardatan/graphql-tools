import { graphql, GraphQLSchema } from 'graphql';
import { delegateToSchema, Subschema } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { RenameObjectFields, RenameRootFields } from '@graphql-tools/wrap';

describe('can delegate to subschema with transforms', () => {
  let sourceSchema: GraphQLSchema;

  beforeAll(() => {
    const ITEM = {
      id: '123',
      camel_case: "I'm a camel!",
    };

    const targetSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Item {
          id: ID!
          camel_case: String
        }
        type ItemConnection {
          edges: [ItemEdge!]!
        }
        type ItemEdge {
          node: Item!
        }
        type Query {
          item: Item
          allItems: ItemConnection!
        }
      `,
      resolvers: {
        Query: {
          item: () => ITEM,
          allItems: () => ({
            edges: [
              {
                node: ITEM,
              },
            ],
          }),
        },
      },
    });

    const subschema = new Subschema({
      schema: targetSchema,
      transforms: [
        new RenameRootFields((_operation, fieldName) => {
          if (fieldName === 'allItems') {
            return 'items';
          }
          return fieldName;
        }),
        new RenameObjectFields((_typeName, fieldName) => {
          if (fieldName === 'camel_case') {
            return 'camelCase';
          }
          return fieldName;
        }),
      ],
    });

    sourceSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Item {
          id: ID!
          camelCase: String
        }
        type ItemConnection {
          edges: [ItemEdge!]!
        }
        type ItemEdge {
          node: Item!
        }
        type Query {
          item: Item
          items: ItemConnection!
        }
      `,
      resolvers: {
        Query: {
          item: (_root, _args, _context, info) =>
            delegateToSchema({
              schema: subschema,
              info,
            }),
          items: (_root, _args, _context, info) =>
            delegateToSchema({
              schema: subschema,
              info,
            }),
        },
      },
    });
  });

  test('renaming should work', async () => {
    const result = await graphql({
      schema: sourceSchema,
      source: /* GraphQL */ `
        query {
          item {
            camelCase
          }
          items {
            edges {
              node {
                camelCase
              }
            }
          }
        }
      `,
    });

    const TRANSFORMED_ITEM = {
      camelCase: "I'm a camel!",
    };

    expect(result).toEqual({
      data: {
        item: TRANSFORMED_ITEM,
        items: {
          edges: [
            {
              node: TRANSFORMED_ITEM,
            },
          ],
        },
      },
    });
  });
});
