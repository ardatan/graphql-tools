import { GraphQLSchema, Kind, OperationTypeNode, parse, SelectionSetNode } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WrapQuery } from '@graphql-tools/wrap';
import { delegateToSchema } from '@graphql-tools/delegate';
import { execute } from '@graphql-tools/executor';

describe('WrapQuery', () => {
  let data: any;
  let subschema: GraphQLSchema;
  let schema: GraphQLSchema;
  beforeAll(() => {
    data = {
      u1: {
        id: 'user1',
        addressStreetAddress: 'Windy Shore 21 A 7',
        addressZip: '12345',
      },
    };
    subschema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          addressStreetAddress: String
          addressZip: String
        }

        type Query {
          userById(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          userById(_parent, { id }) {
            return data[id];
          },
        },
      },
    });
    schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          address: Address
        }

        type Address {
          streetAddress: String
          zip: String
        }

        type Query {
          addressByUser(id: ID!): Address
        }
      `,
      resolvers: {
        Query: {
          addressByUser(_parent, { id }, context, info) {
            return delegateToSchema({
              schema: subschema,
              operation: 'query' as OperationTypeNode,
              fieldName: 'userById',
              args: { id },
              context,
              info,
              transforms: [
                // Wrap document takes a subtree as an AST node
                new WrapQuery(
                  // path at which to apply wrapping and extracting
                  ['userById'],
                  (subtree: SelectionSetNode) => {
                    const newSelectionSet: SelectionSetNode = {
                      kind: Kind.SELECTION_SET,
                      selections: subtree.selections.map(selection => {
                        // just append fragments, not interesting for this
                        // test
                        if (selection.kind === Kind.INLINE_FRAGMENT || selection.kind === Kind.FRAGMENT_SPREAD) {
                          return selection;
                        }
                        // prepend `address` to name and camelCase
                        const oldFieldName = selection.name.value;
                        return {
                          kind: Kind.FIELD,
                          name: {
                            kind: Kind.NAME,
                            value: 'address' + oldFieldName.charAt(0).toUpperCase() + oldFieldName.slice(1),
                          },
                        };
                      }),
                    };
                    return newSelectionSet;
                  },
                  // how to process the data result at path
                  result => ({
                    streetAddress: result.addressStreetAddress,
                    zip: result.addressZip,
                  })
                ),
                // Wrap a second level field
                new WrapQuery(
                  ['userById', 'zip'],
                  (subtree: SelectionSetNode) => subtree,
                  result => result
                ),
              ],
            });
          },
        },
      },
    });
  });

  test('wrapping delegation, returning selectionSet', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          addressByUser(id: "u1") {
            streetAddress
            zip
          }
        }
      `),
    });

    expect(result).toEqual({
      data: {
        addressByUser: {
          streetAddress: 'Windy Shore 21 A 7',
          zip: '12345',
        },
      },
    });
  });
});
