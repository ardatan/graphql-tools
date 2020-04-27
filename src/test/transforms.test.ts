import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLScalarType,
  graphql,
  Kind,
  SelectionSetNode,
  print,
  parse,
  assertValidSchema,
} from 'graphql';

import {
  delegateToSchema,
  defaultMergedResolver,
  ReplaceFieldWithFragment,
  FilterToSchema,
  AddReplacementFragments,
} from '../delegate/index';
import { makeExecutableSchema } from '../generate/index';
import {
  transformSchema,
  RenameTypes,
  RenameRootTypes,
  FilterTypes,
  WrapQuery,
  ExtractField,
  TransformQuery,
  FilterObjectFields,
} from '../wrap/index';
import {
  concatInlineFragments,
  parseFragmentToInlineFragment,
} from '../utils/fragments';
import { addMocksToSchema } from '../mock/index';
import { stitchSchemas } from '../stitch';

import { propertySchema, bookingSchema } from './fixtures/schemas';

function createError<T>(message: string, extra?: T) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error as Error & T;
}

describe('transforms', () => {
  describe('base transform function', () => {
    const scalarTest = `
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
          serialize: (value) => (value as string).slice(1),
          parseValue: (value) => `_${value as string}`,
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
      const schema = transformSchema(scalarSchema, []);
      const result = await graphql(
        schema,
        `
          query($input: TestScalar) {
            testingScalar(input: $input) {
              value
            }
          }
        `,
        {},
        {},
        {
          input: 'test',
        },
      );

      expect(result).toEqual({
        data: {
          testingScalar: {
            value: 'test',
          },
        },
      });
    });

    test('should work when specified as a schema configuration object', async () => {
      const schema = transformSchema(
        { schema: scalarSchema, transforms: [] },
        [],
      );
      const result = await graphql(
        schema,
        `
          query($input: TestScalar) {
            testingScalar(input: $input) {
              value
            }
          }
        `,
        {},
        {},
        {
          input: 'test',
        },
      );

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
        typeDefs: `
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
      const schema = transformSchema(subschema, []);

      const query = 'query { errorTest }';
      const originalResult = await graphql(subschema, query);
      const transformedResult = await graphql(schema, query);
      expect(originalResult).toEqual(transformedResult);
    });
  });

  describe('rename type', () => {
    let schema: GraphQLSchema;
    beforeAll(() => {
      const transforms = [
        new RenameTypes(
          (name: string) =>
            ({
              Property: 'House',
              Location: 'Spots',
              TestInterface: 'TestingInterface',
              DateTime: 'Datum',
              InputWithDefault: 'DefaultingInput',
              TestInterfaceKind: 'TestingInterfaceKinds',
              TestImpl1: 'TestImplementation1',
            }[name]),
        ),
      ];
      schema = transformSchema(propertySchema, transforms);
    });
    test('should work', async () => {
      const result = await graphql(
        schema,
        `
          query($input: DefaultingInput!) {
            interfaceTest(kind: ONE) {
              ... on TestingInterface {
                testString
              }
            }
            propertyById(id: "p1") {
              ... on House {
                id
              }
            }
            dateTimeTest
            defaultInputTest(input: $input)
          }
        `,
        {},
        {},
        {
          input: {
            test: 'bar',
          },
        },
      );

      expect(result).toEqual({
        data: {
          dateTimeTest: '1987-09-25T12:00:00',
          defaultInputTest: 'bar',
          interfaceTest: {
            testString: 'test',
          },
          propertyById: {
            id: 'p1',
          },
        },
      });
    });
  });

  describe('rename root type', () => {
    test('should work', async () => {
      const subschema = makeExecutableSchema({
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
            query: QueryRoot!
          }
        `,
      });

      addMocksToSchema({ schema: subschema });

      const schema = transformSchema(subschema, [
        new RenameRootTypes((name) => (name === 'QueryRoot' ? 'Query' : name)),
      ]);

      const result = await graphql(
        schema,
        `
          mutation {
            doSomething {
              query {
                foo
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
            },
          },
        },
      });
    });

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

  describe('namespace', () => {
    let schema: GraphQLSchema;
    beforeAll(() => {
      const transforms = [
        new RenameTypes((name: string) => `_${name}`),
        new RenameTypes((name: string) => `Property${name}`),
      ];
      schema = transformSchema(propertySchema, transforms);
    });
    test('should work', async () => {
      const result = await graphql(
        schema,
        `
          query($input: Property_InputWithDefault!) {
            interfaceTest(kind: ONE) {
              ... on Property_TestInterface {
                testString
              }
            }
            properties(limit: 1) {
              __typename
              id
            }
            propertyById(id: "p1") {
              ... on Property_Property {
                id
              }
            }
            dateTimeTest
            defaultInputTest(input: $input)
          }
        `,
        {},
        {},
        {
          input: {
            test: 'bar',
          },
        },
      );

      expect(result).toEqual({
        data: {
          dateTimeTest: '1987-09-25T12:00:00',
          defaultInputTest: 'bar',
          interfaceTest: {
            testString: 'test',
          },
          properties: [
            {
              __typename: 'Property_Property',
              id: 'p1',
            },
          ],
          propertyById: {
            id: 'p1',
          },
        },
      });
    });
  });

  describe('filter to schema', () => {
    let filter: FilterToSchema;
    beforeAll(() => {
      filter = new FilterToSchema(bookingSchema);
    });

    test('should remove empty selection sets on objects', () => {
      const query = parse(`
      query customerQuery($id: ID!) {
        customerById(id: $id) {
          id
          name
          address {
            planet
          }
        }
      }
      `);
      const filteredQuery = filter.transformRequest({
        document: query,
        variables: {
          id: 'c1',
        },
      });

      const expected = parse(`
      query customerQuery($id: ID!) {
        customerById(id: $id) {
          id
          name
        }
      }
      `);
      expect(print(filteredQuery.document)).toBe(print(expected));
    });

    test('should also remove variables when removing empty selection sets', () => {
      const query = parse(`
      query customerQuery($id: ID!, $limit: Int) {
        customerById(id: $id) {
          id
          name
          bookings(limit: $limit) {
            paid
          }
        }
      }
      `);
      const filteredQuery = filter.transformRequest({
        document: query,
        variables: {
          id: 'c1',
          limit: 10,
        },
      });

      const expected = parse(`
      query customerQuery($id: ID!) {
        customerById(id: $id) {
          id
          name
        }
      }
      `);
      expect(print(filteredQuery.document)).toBe(print(expected));
    });

    test('should remove empty selection sets on wrapped objects (non-nullable/lists)', () => {
      const query = parse(`
        query bookingQuery($id: ID!) {
          bookingById(id: $id) {
            id
            propertyId
            customer {
              favoriteFood
            }
          }
        }
        `);
      const filteredQuery = filter.transformRequest({
        document: query,
        variables: {
          id: 'b1',
        },
      });

      const expected = parse(`
        query bookingQuery($id: ID!) {
          bookingById(id: $id) {
            id
            propertyId
          }
        }
        `);
      expect(print(filteredQuery.document)).toBe(print(expected));
    });
  });

  describe('filter type', () => {
    let schema: GraphQLSchema;
    beforeAll(() => {
      const typeNames = ['ID', 'String', 'DateTime', 'Query', 'Booking'];
      const transforms = [
        new FilterTypes(
          (type: GraphQLNamedType) => typeNames.indexOf(type.name) >= 0,
        ),
      ];
      schema = transformSchema(bookingSchema, transforms);
    });

    test('should work normally', async () => {
      const result = await graphql(
        schema,
        `
          query {
            bookingById(id: "b1") {
              id
              propertyId
              startTime
              endTime
            }
          }
        `,
      );

      expect(result).toEqual({
        data: {
          bookingById: {
            endTime: '2016-06-03',
            id: 'b1',
            propertyId: 'p1',
            startTime: '2016-05-04',
          },
        },
      });
    });

    test('should error on removed types', async () => {
      const result = await graphql(
        schema,
        `
          query {
            bookingById(id: "b1") {
              id
              propertyId
              startTime
              endTime
              customer {
                id
              }
            }
          }
        `,
      );
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toBe(
        'Cannot query field "customer" on type "Booking".',
      );
    });
  });

  describe('filter fields', () => {
    // Use case: breaking apart monolithic GQL codebase into microservices.
    // E.g. strip out types/fields from the monolith slowly and re-add them
    // as stitched resolvers to another service.
    it('should allow stitching a previously filtered field onto a type', () => {
      const filteredSchema = transformSchema(propertySchema, [
        new FilterObjectFields(
          (typeName, fieldName) =>
            `${typeName}.${fieldName}` !== 'Property.location',
        ),
      ]);

      assertValidSchema(filteredSchema);

      const stitchedSchema = stitchSchemas({
        subschemas: [filteredSchema],
        typeDefs: `
          extend type Property {
            location: Location
          }
        `,
      });

      assertValidSchema(stitchedSchema);
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
        typeDefs: `
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
        typeDefs: `
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
                operation: 'query',
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
                    (result) => result?.address,
                  ),
                ],
              });
            },
          },
          Mutation: {
            async setUserAndAddress(_parent, { input }, context, info) {
              const addressResult = await delegateToSchema({
                schema: subschema,
                operation: 'mutation',
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
                operation: 'mutation',
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
      const result = await graphql(
        schema,
        `
          query {
            addressByUser(id: "u1") {
              streetAddress
              zip
            }
          }
        `,
      );

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
      const result = await graphql(
        schema,
        `
          mutation($input: UserInput!) {
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
        {},
        {},
        {
          input: {
            id: 'u2',
            username: 'new-username',
            streetAddress: 'New Address 555',
            zip: '22222',
          },
        },
      );
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
        typeDefs: `
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
        typeDefs: `
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
                operation: 'query',
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
                      const newSelectionSet = {
                        kind: Kind.SELECTION_SET,
                        selections: subtree.selections.map((selection) => {
                          // just append fragments, not interesting for this
                          // test
                          if (
                            selection.kind === Kind.INLINE_FRAGMENT ||
                            selection.kind === Kind.FRAGMENT_SPREAD
                          ) {
                            return selection;
                          }
                          // prepend `address` to name and camelCase
                          const oldFieldName = selection.name.value;
                          return {
                            kind: Kind.FIELD,
                            name: {
                              kind: Kind.NAME,
                              value:
                                'address' +
                                oldFieldName.charAt(0).toUpperCase() +
                                oldFieldName.slice(1),
                            },
                          };
                        }),
                      };
                      return newSelectionSet;
                    },
                    // how to process the data result at path
                    (result) => ({
                      streetAddress: result.addressStreetAddress,
                      zip: result.addressZip,
                    }),
                  ),
                  // Wrap a second level field
                  new WrapQuery(
                    ['userById', 'zip'],
                    (subtree: SelectionSetNode) => subtree,
                    (result) => result,
                  ),
                ],
              });
            },
          },
        },
      });
    });

    test('wrapping delegation, returning selectionSet', async () => {
      const result = await graphql(
        schema,
        `
          query {
            addressByUser(id: "u1") {
              streetAddress
              zip
            }
          }
        `,
      );

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
        typeDefs: `
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

          type Query {
            userById(id: ID!): User
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
          },
        },
      });
      schema = makeExecutableSchema({
        typeDefs: `
          type Address {
            streetAddress: String
            zip: String
            errorTest: String
          }

          type Query {
            addressByUser(id: ID!): Address
            errorTest(id: ID!): Address
          }
        `,
        resolvers: {
          Query: {
            addressByUser(_parent, { id }, context, info) {
              return delegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: 'userById',
                args: { id },
                context,
                info,
                transforms: [
                  // Wrap document takes a subtree as an AST node
                  new TransformQuery({
                    // path at which to apply wrapping and extracting
                    path: ['userById'],
                    queryTransformer: (subtree: SelectionSetNode) => ({
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
                    resultTransformer: (result) => result?.address,
                    errorPathTransformer: (path) => path.slice(1),
                  }),
                ],
              });
            },
            errorTest(_parent, { id }, context, info) {
              return delegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: 'userById',
                args: { id },
                context,
                info,
                transforms: [
                  new TransformQuery({
                    path: ['userById'],
                    queryTransformer: (subtree: SelectionSetNode) => ({
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
                    resultTransformer: (result) => result?.address,
                    errorPathTransformer: (path) => path.slice(1),
                  }),
                ],
              });
            },
          },
        },
      });
    });

    test('wrapping delegation', async () => {
      const result = await graphql(
        schema,
        `
          query {
            addressByUser(id: "u1") {
              streetAddress
              zip
            }
          }
        `,
      );

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
      const result = await graphql(
        schema,
        `
          query {
            addressByUser(id: "u1") {
              errorTest
            }
          }
        `,
        {},
        {},
        {},
        undefined,
        defaultMergedResolver,
      );

      expect(result).toEqual({
        data: {
          addressByUser: {
            errorTest: null,
          },
        },
        errors: [
          {
            locations: [
              {
                column: 15,
                line: 4,
              },
            ],
            message: 'Test Error!',
            path: ['addressByUser', 'errorTest'],
          },
        ],
      });
    });

    test('preserves errors when delegating from a root field to an error', async () => {
      const result = await graphql(
        schema,
        `
          query {
            errorTest(id: "u1") {
              errorTest
            }
          }
        `,
        {},
        {},
        {},
        undefined,
        defaultMergedResolver,
      );

      expect(result).toEqual({
        data: {
          errorTest: null,
        },
        errors: [new Error('Test Error!')],
      });
    });
  });

  describe('replaces field with fragments', () => {
    let data: any;
    let schema: GraphQLSchema;
    let subschema: GraphQLSchema;
    beforeAll(() => {
      data = {
        u1: {
          id: 'u1',
          name: 'joh',
          surname: 'gats',
        },
      };

      subschema = makeExecutableSchema({
        typeDefs: `
          type User {
            id: ID!
            name: String!
            surname: String!
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
        typeDefs: `
          type User {
            id: ID!
            name: String!
            surname: String!
            fullname: String!
          }

          type Query {
            userById(id: ID!): User
          }
        `,
        resolvers: {
          Query: {
            userById(_parent, { id }, context, info) {
              return delegateToSchema({
                schema: subschema,
                operation: 'query',
                fieldName: 'userById',
                args: { id },
                context,
                info,
                transforms: [
                  new ReplaceFieldWithFragment(subschema, [
                    {
                      field: 'fullname',
                      fragment: 'fragment UserName on User { name }',
                    },
                    {
                      field: 'fullname',
                      fragment: 'fragment UserSurname on User { surname }',
                    },
                  ]),
                ],
              });
            },
          },
          User: {
            fullname(parent, _args, _context, _info) {
              return `${parent.name as string} ${parent.surname as string}`;
            },
          },
        },
      });
    });
    test('should work', async () => {
      const result = await graphql(
        schema,
        `
          query {
            userById(id: "u1") {
              id
              fullname
            }
          }
        `,
      );

      expect(result).toEqual({
        data: {
          userById: {
            id: 'u1',
            fullname: 'joh gats',
          },
        },
      });
    });
  });
});

describe('replaces field with processed fragment node', () => {
  let data: any;
  let schema: GraphQLSchema;
  let subschema: GraphQLSchema;
  beforeAll(() => {
    data = {
      u1: {
        id: 'u1',
        name: 'joh',
        surname: 'gats',
      },
    };

    subschema = makeExecutableSchema({
      typeDefs: `
        type User {
          id: ID!
          name: String!
          surname: String!
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
      typeDefs: `
        type User implements Named {
          id: ID!
          name: String!
          surname: String!
          fullname: String!
          specialName: String!
        }

        type Query {
          userById(id: ID!): User
        }

        interface Named {
          specialName: String!
        }
      `,
      resolvers: {
        Query: {
          userById(_parent, { id }, context, info) {
            return delegateToSchema({
              schema: subschema,
              operation: 'query',
              fieldName: 'userById',
              args: { id },
              context,
              info,
              transforms: [
                new AddReplacementFragments(subschema, {
                  User: {
                    fullname: concatInlineFragments('User', [
                      parseFragmentToInlineFragment(
                        'fragment UserName on User { name }',
                      ),
                      parseFragmentToInlineFragment(
                        'fragment UserSurname on User { surname }',
                      ),
                      parseFragmentToInlineFragment('... on Named { name }'),
                    ]),
                  },
                }),
              ],
            });
          },
        },
        User: {
          fullname(parent, _args, _context, _info) {
            return `${parent.name as string} ${parent.surname as string}`;
          },
          specialName() {
            return data.u1.name;
          },
        },
      },
    });
  });
  test('should work', async () => {
    const result = await graphql(
      schema,
      `
        query {
          userById(id: "u1") {
            id
            fullname
          }
        }
      `,
    );

    expect(result).toEqual({
      data: {
        userById: {
          id: 'u1',
          fullname: 'joh gats',
        },
      },
    });
  });

  it('should accept fragments and resolvers that rely on an interface the type implements', async () => {
    const result = await graphql(
      schema,
      `
        query {
          userById(id: "u1") {
            specialName
          }
        }
      `,
    );

    expect(result).toEqual({
      data: {
        userById: {
          specialName: data.u1.name,
        },
      },
    });
  });
});
