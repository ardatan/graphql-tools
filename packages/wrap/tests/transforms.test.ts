import { GraphQLSchema, GraphQLScalarType, Kind, SelectionSetNode, graphql, OperationTypeNode } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { wrapSchema, WrapQuery, ExtractField, TransformQuery } from '@graphql-tools/wrap';

import { delegateToSchema, defaultMergedResolver } from '@graphql-tools/delegate';
import { createGraphQLError } from '@graphql-tools/utils';

function createError<T>(message: string, extra?: T) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error as Error & T;
}

describe('transforms', () => {
  describe('base transform function', () => {
    const scalarTest = /* GraphQL */ `
      scalar TestScalar
      type TestingScalar {
        value: TestScalar
      }

      type Query {
        testingScalar(input: TestScalar): TestingScalar
      }
    `;

    const scalarSchema = makeExecutableSchema({
      typeDefs: scalarTest,
      resolvers: {
        TestScalar: new GraphQLScalarType({
          name: 'TestScalar',
          description: undefined,
          serialize: value => (value as string).slice(1),
          parseValue: value => `_${value as string}`,
          parseLiteral: (ast: any) => `_${ast.value as string}`,
        }),
        Query: {
          testingScalar(_parent, args) {
            return {
              value: args.input[0] === '_' ? args.input : null,
            };
          },
        },
      },
    });

    test('should work', async () => {
      const schema = wrapSchema({ schema: scalarSchema });
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query ($input: TestScalar) {
            testingScalar(input: $input) {
              value
            }
          }
        `,
        variableValues: {
          input: 'test',
        },
      });

      expect(result).toEqual({
        data: {
          testingScalar: {
            value: 'test',
          },
        },
      });
    });

    test('should work when specified as a subschema configuration object', async () => {
      const schema = wrapSchema({
        schema: scalarSchema,
        transforms: [],
      });
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query ($input: TestScalar) {
            testingScalar(input: $input) {
              value
            }
          }
        `,
        variableValues: {
          input: 'test',
        },
      });

      expect(result).toEqual({
        data: {
          testingScalar: {
            value: 'test',
          },
        },
      });
    });

    test('should not change error type', async () => {
      const customError = createError('TestError', {
        data: { code: '123' },
        message: 'TestError Error',
      });

      const subschema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            errorTest: String
          }
        `,
        resolvers: {
          Query: {
            errorTest: () => customError,
          },
        },
      });
      const schema = wrapSchema({ schema: subschema });

      const query = /* GraphQL */ `
        query {
          errorTest
        }
      `;
      const originalResult = await graphql({
        schema: subschema,
        source: query,
      });
      const transformedResult = await graphql({
        schema,
        source: query,
      });
      expect(originalResult).toEqual(transformedResult);
    });
  });

  describe('tree operations', () => {
    let data: any;
    let subschema: GraphQLSchema;
    let schema: GraphQLSchema;
    beforeAll(() => {
      data = {
        u1: {
          id: 'u1',
          username: 'alice',
          address: {
            streetAddress: 'Windy Shore 21 A 7',
            zip: '12345',
          },
        },
        u2: {
          id: 'u2',
          username: 'bob',
          address: {
            streetAddress: 'Snowy Mountain 5 B 77',
            zip: '54321',
          },
        },
      };
      subschema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            username: String
            address: Address
          }

          type Address {
            streetAddress: String
            zip: String
          }

          input UserInput {
            id: ID!
            username: String
          }

          input AddressInput {
            id: ID!
            streetAddress: String
            zip: String
          }

          type Query {
            userById(id: ID!): User
          }

          type Mutation {
            setUser(input: UserInput!): User
            setAddress(input: AddressInput!): Address
          }
        `,
        resolvers: {
          Query: {
            userById(_parent, { id }) {
              return data[id];
            },
          },
          Mutation: {
            setUser(_parent, { input }) {
              if (data[input.id]) {
                return {
                  ...data[input.id],
                  ...input,
                };
              }
            },
            setAddress(_parent, { input }) {
              if (data[input.id]) {
                return {
                  ...data[input.id].address,
                  ...input,
                };
              }
            },
          },
        },
      });
      schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            username: String
            address: Address
          }

          type Address {
            streetAddress: String
            zip: String
          }

          input UserInput {
            id: ID!
            username: String
            streetAddress: String
            zip: String
          }

          type Query {
            addressByUser(id: ID!): Address
          }

          type Mutation {
            setUserAndAddress(input: UserInput!): User
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
                    (subtree: SelectionSetNode) => ({
                      // we create a wrapping AST Field
                      kind: Kind.FIELD,
                      name: {
                        kind: Kind.NAME,
                        // that field is `address`
                        value: 'address',
                      },
                      // Inside the field selection
                      selectionSet: subtree,
                    }),
                    // how to process the data result at path
                    result => result?.address
                  ),
                ],
              });
            },
          },
          Mutation: {
            async setUserAndAddress(_parent, { input }, context, info) {
              const addressResult = await delegateToSchema({
                schema: subschema,
                operation: 'mutation' as OperationTypeNode,
                fieldName: 'setAddress',
                args: {
                  input: {
                    id: input.id,
                    streetAddress: input.streetAddress,
                    zip: input.zip,
                  },
                },
                context,
                info,
                transforms: [
                  // ExtractField takes a path from which to extract the query
                  // for delegation and path to which to move it
                  new ExtractField({
                    from: ['setAddress', 'address'],
                    to: ['setAddress'],
                  }),
                ],
              });
              const userResult = await delegateToSchema({
                schema: subschema,
                operation: 'mutation' as OperationTypeNode,
                fieldName: 'setUser',
                args: {
                  input: {
                    id: input.id,
                    username: input.username,
                  },
                },
                context,
                info,
              });
              return {
                ...userResult,
                address: addressResult,
              };
            },
          },
        },
      });
    });

    test('wrapping delegation', async () => {
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query {
            addressByUser(id: "u1") {
              streetAddress
              zip
            }
          }
        `,
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

    test('extracting delegation', async () => {
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          mutation ($input: UserInput!) {
            setUserAndAddress(input: $input) {
              username
              address {
                zip
                streetAddress
              }
            }
          }

          # fragment UserFragment on User {
          #   address {
          #     zip
          #     ...AddressFragment
          #   }
          # }
          #
          # fragment AddressFragment on Address {
          #   streetAddress
          # }
        `,
        variableValues: {
          input: {
            id: 'u2',
            username: 'new-username',
            streetAddress: 'New Address 555',
            zip: '22222',
          },
        },
      });
      expect(result).toEqual({
        data: {
          setUserAndAddress: {
            username: 'new-username',
            address: {
              streetAddress: 'New Address 555',
              zip: '22222',
            },
          },
        },
      });
    });
  });

  describe('TransformQuery', () => {
    let data: any;
    let subschema: GraphQLSchema;
    let schema: GraphQLSchema;
    beforeAll(() => {
      data = {
        u1: {
          id: 'u1',
          username: 'alice',
          address: {
            streetAddress: 'Windy Shore 21 A 7',
            zip: '12345',
          },
        },
        u2: {
          id: 'u2',
          username: 'bob',
          address: {
            streetAddress: 'Snowy Mountain 5 B 77',
            zip: '54321',
          },
        },
      };
      subschema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type User {
            id: ID!
            username: String
            address: Address
            errorTest: Address
          }

          type Address {
            streetAddress: String
            zip: String
            errorTest: String
          }

          scalar PageInfo

          type UserConnection {
            pageInfo: PageInfo!
            nodes: [User!]
          }

          type Query {
            userById(id: ID!): User
            usersByIds(ids: [ID!]): UserConnection!
          }
        `,
        resolvers: {
          User: {
            errorTest: () => {
              throw new Error('Test Error!');
            },
          },
          Address: {
            errorTest: () => {
              throw new Error('Test Error!');
            },
          },
          Query: {
            userById(_parent, { id }) {
              return data[id];
            },
            usersByIds(_parent, { ids }) {
              return {
                nodes: Object.entries(data)
                  .filter(([id, _value]) => ids.includes(id))
                  .map(([_id, value]) => value),
                pageInfo: '1',
              };
            },
          },
        },
      });
      schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Address {
            streetAddress: String
            zip: String
            errorTest: String
          }

          scalar PageInfo

          type AddressConnection {
            pageInfo: PageInfo!
            nodes: [Address!]
          }

          type Query {
            addressByUser(id: ID!): Address
            errorTest(id: ID!): Address
            addressesByUsers(ids: [ID!]): AddressConnection!
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
                  new TransformQuery({
                    // path at which to apply wrapping and extracting
                    path: ['userById'],
                    queryTransformer: (subtree: SelectionSetNode | undefined) => ({
                      kind: Kind.SELECTION_SET,
                      selections: [
                        {
                          // we create a wrapping AST Field
                          kind: Kind.FIELD,
                          name: {
                            kind: Kind.NAME,
                            // that field is `address`
                            value: 'address',
                          },
                          // Inside the field selection
                          selectionSet: subtree,
                        },
                      ],
                    }),
                    // how to process the data result at path
                    resultTransformer: result => result?.address,
                    errorPathTransformer: path => path.slice(1),
                  }),
                ],
              });
            },
            addressesByUsers(_parent, { ids }, context, info) {
              return delegateToSchema({
                schema: subschema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'usersByIds',
                args: { ids },
                context,
                info,
                transforms: [
                  // Wrap document takes a subtree as an AST node
                  new TransformQuery({
                    // longer path, useful when transforming paginated results
                    path: ['usersByIds', 'nodes'],
                    queryTransformer: (subtree: SelectionSetNode | undefined) => ({
                      // same query transformation as above
                      kind: Kind.SELECTION_SET,
                      selections: [
                        {
                          kind: Kind.FIELD,
                          name: {
                            kind: Kind.NAME,
                            value: 'address',
                          },
                          selectionSet: subtree,
                        },
                      ],
                    }),
                    // how to process the data result at path
                    resultTransformer: result => result.map((u: any) => u.address),
                    errorPathTransformer: path => path.slice(1),
                  }),
                ],
              });
            },
            errorTest(_parent, { id }, context, info) {
              return delegateToSchema({
                schema: subschema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'userById',
                args: { id },
                context,
                info,
                transforms: [
                  new TransformQuery({
                    path: ['userById'],
                    queryTransformer: (subtree: SelectionSetNode | undefined) => ({
                      kind: Kind.SELECTION_SET,
                      selections: [
                        {
                          kind: Kind.FIELD,
                          name: {
                            kind: Kind.NAME,
                            value: 'errorTest',
                          },
                          selectionSet: subtree,
                        },
                      ],
                    }),
                    resultTransformer: result => result?.address,
                    errorPathTransformer: path => path.slice(1),
                  }),
                ],
              });
            },
          },
        },
      });
    });

    test('wrapping delegation', async () => {
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query {
            addressByUser(id: "u1") {
              streetAddress
              zip
            }
          }
        `,
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

    test('preserves errors from underlying fields', async () => {
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query {
            addressByUser(id: "u1") {
              errorTest
            }
          }
        `,
        fieldResolver: defaultMergedResolver,
      });

      expect(result).toEqual({
        data: {
          addressByUser: {
            errorTest: null,
          },
        },
        errors: [
          createGraphQLError('Test Error!', {
            positions: [15, 4],
            path: ['addressByUser', 'errorTest'],
          }),
        ],
      });
    });

    test('preserves errors when delegating from a root field to an error', async () => {
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query {
            errorTest(id: "u1") {
              errorTest
            }
          }
        `,
        fieldResolver: defaultMergedResolver,
      });

      expect(result).toEqual({
        data: {
          errorTest: null,
        },
        errors: [new Error('Test Error!')],
      });
    });

    test('nested path produces nested result, other fields get preserved', async () => {
      const result = await graphql({
        schema,
        source: /* GraphQL */ `
          query {
            addressesByUsers(ids: ["u1", "u2"]) {
              nodes {
                streetAddress
                zip
              }
              pageInfo
            }
          }
        `,
      });

      expect(result).toEqual({
        data: {
          addressesByUsers: {
            nodes: [
              {
                streetAddress: 'Windy Shore 21 A 7',
                zip: '12345',
              },
              {
                streetAddress: 'Snowy Mountain 5 B 77',
                zip: '54321',
              },
            ],
            pageInfo: '1',
          },
        },
      });
    });
  });
});
