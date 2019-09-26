/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import {
  graphql,
  GraphQLSchema,
  GraphQLField,
  GraphQLObjectType,
  GraphQLScalarType,
  subscribe,
  parse,
  ExecutionResult,
  defaultFieldResolver,
  findDeprecatedUsages,
  printSchema,
} from 'graphql';
import mergeSchemas from '../stitching/mergeSchemas';
import {
  propertySchema as localPropertySchema,
  productSchema as localProductSchema,
  bookingSchema as localBookingSchema,
  subscriptionSchema as localSubscriptionSchema,
  remoteBookingSchema,
  remotePropertySchema,
  remoteProductSchema,
  subscriptionPubSub,
  subscriptionPubSubTrigger,
} from './testingSchemas';
import { SchemaDirectiveVisitor } from '../utils/SchemaDirectiveVisitor';
import { forAwaitEach } from 'iterall';
import { makeExecutableSchema } from '../makeExecutableSchema';
import {
  IResolvers,
  SchemaExecutionConfig,
} from '../Interfaces';
import { delegateToSchema } from '../stitching';
import { cloneSchema } from '../utils';
import { getResolversFromSchema } from '../utils/getResolversFromSchema';

const removeLocations = ({ locations, ...rest }: any): any => ({ ...rest });

const testCombinations = [
  {
    name: 'local',
    booking: localBookingSchema,
    property: localPropertySchema,
    product: localProductSchema,
  },
  {
    name: 'remote',
    booking: remoteBookingSchema,
    property: remotePropertySchema,
    product: remoteProductSchema,
  },
  {
    name: 'hybrid',
    booking: localBookingSchema,
    property: remotePropertySchema,
    product: localProductSchema,
  },
  {
    name: 'recreated',
    booking: cloneSchema(localBookingSchema),
    property: makeExecutableSchema({
      typeDefs: printSchema(localPropertySchema),
      resolvers: getResolversFromSchema(localPropertySchema),
    }),
    product: cloneSchema(localProductSchema),
  }
];

let scalarTest = `
  """
  Description of TestScalar.
  """
  scalar TestScalar

  """
  Description of AnotherNewScalar.
  """
  scalar AnotherNewScalar

  """
  A type that uses TestScalar.
  """
  type TestingScalar {
    value: TestScalar
  }

  type Query {
    testingScalar(input: TestScalar): TestingScalar
    listTestingScalar(input: TestScalar): [TestingScalar]
  }
`;

let scalarSchema: GraphQLSchema;

scalarSchema = makeExecutableSchema({
  typeDefs: scalarTest,
  resolvers: {
    TestScalar: new GraphQLScalarType({
      name: 'TestScalar',
      description: undefined,
      serialize: value => (value as string).slice(1),
      parseValue: value => `_${value}`,
      parseLiteral: (ast: any) => `_${ast.value}`,
    }),
    Query: {
      testingScalar(parent, args) {
        return {
          value: args.input[0] === '_' ? args.input : null
        };
      },
      listTestingScalar(parent, args) {
        return [{
          value: args.input[0] === '_' ? args.input : null
        }];
      },
    },
  },
});

let enumTest = `
  """
  A type that uses an Enum.
  """
  enum Color {
    """
    A vivid color
    """
    RED
  }

  """
  A type that uses an Enum with a numeric constant.
  """
  enum NumericEnum {
    """
    A test description
    """
    TEST @deprecated(reason: "This is deprecated")
  }

  type EnumWrapper {
    color: Color
    numericEnum: NumericEnum
  }

  union UnionWithEnum = EnumWrapper

  schema {
    query: Query
  }

  type Query {
    color(input: Color): Color
    numericEnum: NumericEnum
    listNumericEnum: [NumericEnum]
    wrappedEnum: EnumWrapper
    unionWithEnum: UnionWithEnum
  }
`;

let enumSchema: GraphQLSchema;

enumSchema = makeExecutableSchema({
  typeDefs: enumTest,
  resolvers: {
    Color: {
      RED: '#EA3232',
    },
    NumericEnum: {
      TEST: 1,
    },
    UnionWithEnum: {
      __resolveType: () => 'EnumWrapper'
    },
    Query: {
      color(parent, args) {
        return args.input === '#EA3232' ? args.input : null;
      },
      numericEnum() {
        return 1;
      },
      listNumericEnum() {
        return [1];
      },
      wrappedEnum() {
        return {
          color: '#EA3232',
          numericEnum: 1
        };
      },
      unionWithEnum() {
        return {
          color: '#EA3232',
          numericEnum: 1
        };
      },
    },
  },
});

let linkSchema = `
  """
  A new type linking the Property type.
  """
  type LinkType {
    test: String
    """
    The property.
    """
    property: Property
  }

  interface Node {
    id: ID!
  }

  extend type Car implements Node {
    fakeFieldToSatisfyOldGraphQLRemoveAfter12: String
  }

  extend type Bike implements Node {
    fakeFieldToSatisfyOldGraphQLRemoveAfter12: String
  }

  extend type Booking implements Node {
    """
    The property of the booking.
    """
    property: Property
    """
    A textual description of the booking.
    """
    textDescription: String
  }

  extend type Property implements Node {
    """
    A list of bookings.
    """
    bookings(
      """
      The maximum number of bookings to retrieve.
      """
      limit: Int
    ): [Booking]
  }

  extend type Query {
    delegateInterfaceTest: TestInterface
    delegateArgumentTest(arbitraryArg: Int): Property
    """
    A new field on the root query.
    """
    linkTest: LinkType
    node(id: ID!): Node
    nodes: [Node]
  }

  extend type Customer implements Node
`;

const loneExtend = parse(`
  extend type Booking {
    foo: String!
  }
`);

let interfaceExtensionTest = `
  # No-op for older versions since this feature does not yet exist
  extend type DownloadableProduct {
    filesize: Int
  }
`;

interfaceExtensionTest = `
  extend interface Downloadable {
    filesize: Int
  }

  extend type DownloadableProduct {
    filesize: Int
  }
`;

// Miscellaneous typeDefs that exercise uncommon branches for the sake of
// code coverage.
const codeCoverageTypeDefs = `
  interface SyntaxNode {
    type: String
  }

  type Statement implements SyntaxNode {
    type: String
  }

  type Expression implements SyntaxNode {
    type: String
  }

  union ASTNode = Statement | Expression

  enum Direction {
    NORTH
    SOUTH
    EAST
    WEST
  }

  input WalkingPlan {
    steps: Int
    direction: Direction
  }
`;

let schemaDirectiveTypeDefs = `
  directive @upper on FIELD_DEFINITION

  directive @withEnumArg(enumArg: DirectiveEnum = FOO) on FIELD_DEFINITION

  enum DirectiveEnum {
    FOO
    BAR
  }

  extend type Property {
    someField: String! @upper
    someOtherField: String! @withEnumArg
    someThirdField: String! @withEnumArg(enumArg: BAR)
  }
`;

testCombinations.forEach(async combination => {
  describe('merging ' + combination.name, () => {
    let mergedSchema: GraphQLSchema,
      propertySchema: GraphQLSchema | SchemaExecutionConfig,
      productSchema: GraphQLSchema | SchemaExecutionConfig,
      bookingSchema: GraphQLSchema | SchemaExecutionConfig;

    before(async () => {
      propertySchema = await combination.property;
      bookingSchema = await combination.booking;
      productSchema = await combination.product;

      mergedSchema = mergeSchemas({
        schemas: [
          propertySchema,
          bookingSchema,
          productSchema,
          interfaceExtensionTest,
          scalarSchema,
          enumSchema,
          linkSchema,
          loneExtend,
          localSubscriptionSchema,
          codeCoverageTypeDefs,
          schemaDirectiveTypeDefs,
        ],
        schemaDirectives: {
          upper: class extends SchemaDirectiveVisitor {
            public visitFieldDefinition(field: GraphQLField<any, any>) {
              const { resolve = defaultFieldResolver } = field;
              field.resolve = async function(...args: any[]) {
                const result = await resolve.apply(this, args);
                if (typeof result === 'string') {
                  return result.toUpperCase();
                }
                return result;
              };
            }
          },
        },
        mergeDirectives: true,
        resolvers: {
          Property: {
            bookings: {
              fragment: '... on Property { id }',
              resolve(parent, args, context, info) {
                if (combination.name === 'local') {
                  // Use the old mergeInfo.delegate API just this once, to make
                  // sure it continues to work.
                  return info.mergeInfo.delegate(
                    'query',
                    'bookingsByPropertyId',
                    {
                      propertyId: parent.id,
                      limit: args.limit ? args.limit : null,
                    },
                    context,
                    info,
                  );
                } else {
                  return delegateToSchema({
                    schema: bookingSchema,
                    operation: 'query',
                    fieldName: 'bookingsByPropertyId',
                    args: {
                      propertyId: parent.id,
                      limit: args.limit ? args.limit : null,
                    },
                    context,
                    info,
                  });
                }
              },
            },
            someField: {
              resolve() {
                return 'someField';
              },
            },
          },
          Booking: {
            property: {
              fragment: 'fragment BookingFragment on Booking { propertyId }',
              resolve(parent, args, context, info) {
                return delegateToSchema({
                  schema: propertySchema,
                  operation: 'query',
                  fieldName: 'propertyById',
                  args: {
                    id: parent.propertyId,
                  },
                  context,
                  info,
                });
              },
            },
            textDescription: {
              fragment: '... on Booking { id }',
              resolve(parent, args, context, info) {
                return `Booking #${parent.id}`;
              },
            },
          },
          DownloadableProduct: {
            filesize() {
              return 1024;
            },
          },
          LinkType: {
            property: {
              resolve(parent, args, context, info) {
                return delegateToSchema({
                  schema: propertySchema,
                  operation: 'query',
                  fieldName: 'propertyById',
                  args: {
                    id: 'p1',
                  },
                  context,
                  info,
                });
              },
            },
          },
          Query: {
            delegateInterfaceTest(parent, args, context, info) {
              return delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'interfaceTest',
                args: {
                  kind: 'ONE',
                },
                context,
                info,
              });
            },
            delegateArgumentTest(parent, args, context, info) {
              return delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'propertyById',
                args: {
                  id: 'p1',
                },
                context,
                info,
              });
            },
            linkTest() {
              return {
                test: 'test',
              };
            },
            node: {
              // fragment doesn't work
              fragment: '... on Node { id }',
              resolve(parent, args, context, info) {
                if (args.id.startsWith('p')) {
                  return delegateToSchema({
                    schema: propertySchema,
                    operation: 'query',
                    fieldName: 'propertyById',
                    args,
                    context,
                    info,
                  });
                } else if (args.id.startsWith('b')) {
                  return delegateToSchema({
                    schema: bookingSchema,
                    operation: 'query',
                    fieldName: 'bookingById',
                    args,
                    context,
                    info,
                  });
                } else if (args.id.startsWith('c')) {
                  return delegateToSchema({
                    schema: bookingSchema,
                    operation: 'query',
                    fieldName: 'customerById',
                    args,
                    context,
                    info,
                  });
                } else {
                  throw new Error('invalid id');
                }
              },
            },
            async nodes(parent, args, context, info) {
              const bookings = await delegateToSchema({
                schema: bookingSchema,
                operation: 'query',
                fieldName: 'bookings',
                context,
                info,
              });
              const properties = await delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'properties',
                context,
                info,
              });
              return [...bookings, ...properties];
            },
          },
        },
      });
    });

    describe('basic', () => {
      it('works with context', async () => {
        const propertyResult = await graphql(
          localPropertySchema,
          `
            query {
              contextTest(key: "test")
            }
          `,
          {},
          {
            test: 'Foo',
          },
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              contextTest(key: "test")
            }
          `,
          {},
          {
            test: 'Foo',
          },
        );

        expect(propertyResult).to.deep.equal({
          data: {
            contextTest: '"Foo"',
          },
        });

        expect(mergedResult).to.deep.equal(propertyResult);
      });

      it('works with custom scalars', async () => {
        const propertyResult = await graphql(
          localPropertySchema,
          `
            query {
              dateTimeTest
              test1: jsonTest(input: { foo: "bar" })
              test2: jsonTest(input: 5)
              test3: jsonTest(input: "6")
            }
          `,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              dateTimeTest
              test1: jsonTest(input: { foo: "bar" })
              test2: jsonTest(input: 5)
              test3: jsonTest(input: "6")
            }
          `,
        );

        expect(propertyResult).to.deep.equal({
          data: {
            dateTimeTest: '1987-09-25T12:00:00',
            test1: { foo: 'bar' },
            test2: 5,
            test3: '6',
          },
        });
        expect(mergedResult).to.deep.equal(propertyResult);
      });

      it('works with custom scalars', async () => {
        const scalarResult = await graphql(
          scalarSchema,
          `
            query {
              testingScalar(input: "test") {
                value
              }
              listTestingScalar(input: "test") {
                value
              }
            }
          `,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              testingScalar(input: "test") {
                value
              }
              listTestingScalar(input: "test") {
                value
              }
            }
          `,
        );

        expect(scalarResult).to.deep.equal({
          data: {
            testingScalar: {
              value: 'test'
            },
            listTestingScalar: [{
              value: 'test'
            }]
          },
        });
        expect(mergedResult).to.deep.equal(scalarResult);
      });

      it('works with custom enums', async () => {
        const enumResult = await graphql(
          enumSchema,
          `
            query {
              color(input: RED)
              numericEnum
              listNumericEnum
              numericEnumInfo: __type(name: "NumericEnum") {
                enumValues(includeDeprecated: true) {
                  name
                  description
                  isDeprecated
                  deprecationReason
                }
              }
              colorEnumInfo: __type(name: "Color") {
                enumValues {
                  name
                  description
                }
              }
              wrappedEnum {
                color
                numericEnum
              }
              unionWithEnum {
                ... on EnumWrapper {
                  color
                  numericEnum
                }
              }
            }
          `,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              color(input: RED)
              numericEnum
              listNumericEnum
              numericEnumInfo: __type(name: "NumericEnum") {
                enumValues(includeDeprecated: true) {
                  name
                  description
                  isDeprecated
                  deprecationReason
                }
              }
              colorEnumInfo: __type(name: "Color") {
                enumValues {
                  name
                  description
                }
              }
              wrappedEnum {
                color
                numericEnum
              }
              unionWithEnum {
                ... on EnumWrapper {
                  color
                  numericEnum
                }
              }
            }
          `,
        );

        expect(enumResult).to.deep.equal({
          data: {
            color: 'RED',
            numericEnum: 'TEST',
            listNumericEnum: ['TEST'],
            numericEnumInfo: {
              enumValues: [
                {
                  description: 'A test description',
                  name: 'TEST',
                  isDeprecated: true,
                  deprecationReason: 'This is deprecated',
                },
              ],
            },
            colorEnumInfo: {
              enumValues: [
                {
                  description: 'A vivid color',
                  name: 'RED',
                },
              ],
            },
            wrappedEnum: {
              color: 'RED',
              numericEnum: 'TEST',
            },
            unionWithEnum: {
              color: 'RED',
              numericEnum: 'TEST',
            },
          },
        });
        expect(mergedResult).to.deep.equal(enumResult);
      });

      it('queries', async () => {
        const propertyFragment = `
propertyById(id: "p1") {
  id
  name
}
  `;
        const bookingFragment = `
bookingById(id: "b1") {
  id
  customer {
    name
  }
  startTime
  endTime
}
  `;

        const propertyResult = await graphql(
          localPropertySchema,
          `query { ${propertyFragment} }`,
        );

        const bookingResult = await graphql(
          localBookingSchema,
          `query { ${bookingFragment} }`,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `query {
      ${propertyFragment}
      ${bookingFragment}
    }`,
        );
        expect(mergedResult).to.deep.equal({
          data: {
            ...propertyResult.data,
            ...bookingResult.data,
          },
        });
      });

      // Technically mutations are not idempotent, but they are in our test schemas
      it('mutations', async () => {
        const mutationFragment = `
      mutation Mutation($input: BookingInput!) {
        addBooking(input: $input) {
          id
          customer {
            name
          }
          startTime
          endTime
        }
      }
    `;
        const input = {
          propertyId: 'p1',
          customerId: 'c1',
          startTime: '2015-01-10',
          endTime: '2015-02-10',
        };

        const bookingResult = await graphql(
          localBookingSchema,
          mutationFragment,
          {},
          {},
          {
            input,
          },
        );
        const mergedResult = await graphql(
          mergedSchema,
          mutationFragment,
          {},
          {},
          {
            input,
          },
        );

        expect(mergedResult).to.deep.equal(bookingResult);
      });

      it('local subscriptions working in merged schema', done => {
        const mockNotification = {
          notifications: {
            text: 'Hello world',
          },
        };

        const subscription = parse(`
          subscription Subscription {
            notifications {
              text
            }
          }
        `);

        let notificationCnt = 0;
        subscribe(mergedSchema, subscription)
          .then(results => {
            forAwaitEach(
              results as AsyncIterable<ExecutionResult>,
              (result: ExecutionResult) => {
                expect(result).to.have.property('data');
                expect(result.data).to.deep.equal(mockNotification);
                !notificationCnt++ ? done() : null;
              },
            ).catch(done);
          }).then(() => {
            subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
          }).catch(done);
      });

      it('subscription errors are working correctly in merged schema', done => {
        const mockNotification = {
          notifications: {
            text: 'Hello world',
          },
        };

        const expectedResult = {
          data: {
            notifications: {
              text: 'Hello world',
              throwError: null,
            },
          } as any,
          errors: [
            {
              message: 'subscription field error',
              path: ['notifications', 'throwError'],
              locations: [
                {
                  line: 4,
                  column: 15,
                },
              ],
            },
          ],
        };

        const subscription = parse(`
          subscription Subscription {
            notifications {
              throwError
              text
            }
          }
        `);

        let notificationCnt = 0;
        subscribe(mergedSchema, subscription)
          .then(results => {
            forAwaitEach(
              results as AsyncIterable<ExecutionResult>,
              (result: ExecutionResult) => {
                expect(result).to.have.property('data');
                expect(result).to.have.property('errors');
                expect(result.errors).to.have.lengthOf(1);
                expect(result.errors).to.deep.equal(expectedResult.errors);
                expect(result.data).to.deep.equal(expectedResult.data);
                !notificationCnt++ ? done() : null;
              },
            ).catch(done);
          }).then(() => {
            subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
          }).catch(done);
      });

      it('links in queries', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              firstProperty: propertyById(id: "p2") {
                id
                name
                bookings {
                  id
                  textDescription
                  customer {
                    name
                  }
                }
              }
              secondProperty: propertyById(id: "p3") {
                id
                name
                bookings {
                  id
                  customer {
                    name
                  }
                }
              }
              booking: bookingById(id: "b1") {
                id
                customer {
                  name
                }
                property {
                  id
                  name
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            firstProperty: {
              id: 'p2',
              name: 'Another great hotel',
              bookings: [
                {
                  id: 'b4',
                  textDescription: 'Booking #b4',
                  customer: {
                    name: 'Exampler Customer',
                  },
                },
              ],
            },
            secondProperty: {
              id: 'p3',
              name: 'BedBugs - The Affordable Hostel',
              bookings: [],
            },
            booking: {
              id: 'b1',
              customer: {
                name: 'Exampler Customer',
              },

              property: {
                id: 'p1',
                name: 'Super great hotel',
              },
            },
          },
        });
      });

      it('interfaces', async () => {
        const query = `
          query {
            test1: interfaceTest(kind: ONE) {
              __typename
              kind
              testString
              ...on TestImpl1 {
                foo
              }
              ...on TestImpl2 {
                bar
              }
            }

            test2: interfaceTest(kind: TWO) {
              __typename
              kind
              testString
              ...on TestImpl1 {
                foo
              }
              ...on TestImpl2 {
                bar
              }
            }
          }
        `;
        const propertyResult = await graphql(localPropertySchema, query);
        const mergedResult = await graphql(mergedSchema, query);

        expect(propertyResult).to.deep.equal({
          data: {
            test1: {
              __typename: 'TestImpl1',
              kind: 'ONE',
              testString: 'test',
              foo: 'foo',
            },
            test2: {
              __typename: 'TestImpl2',
              kind: 'TWO',
              testString: 'test',
              bar: 'bar',
            },
          },
        });

        expect(mergedResult).to.deep.equal(propertyResult);

        const delegateQuery = `
          query {
            withTypeName: delegateInterfaceTest {
              __typename
              kind
              testString
            }
            withoutTypeName: delegateInterfaceTest {
              kind
              testString
            }
          }
        `;

        const mergedDelegate = await graphql(mergedSchema, delegateQuery);

        expect(mergedDelegate).to.deep.equal({
          data: {
            withTypeName: {
              __typename: 'TestImpl1',
              kind: 'ONE',
              testString: 'test',
            },
            withoutTypeName: {
              kind: 'ONE',
              testString: 'test',
            },
          },
        });
      });

      it('unions', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              customerById(id: "c1") {
                ... on Person {
                  name
                }
                vehicle {
                  ... on Bike {
                    bikeType
                  }
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            customerById: {
              name: 'Exampler Customer',
              vehicle: { bikeType: 'MOUNTAIN' },
            },
          },
        });
      });

      it('unions with alias', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              customerById(id: "c1") {
                ... on Person {
                  name
                }
                v1: vehicle {
                  ... on Bike {
                    bikeType
                  }
                }
                v2: vehicle {
                  ... on Bike {
                    bikeType
                  }
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            customerById: {
              name: 'Exampler Customer',
              v1: { bikeType: 'MOUNTAIN' },
              v2: { bikeType: 'MOUNTAIN' },
            },
          },
        });
      });

      it('unions implementing interface', async () => {
        const query = `
          query {
            test1: unionTest(output: "Interface") {
              ... on TestInterface {
                kind
                testString
              }
              ... on TestImpl1 {
                foo
              }
              ... on UnionImpl {
                someField
              }
            }

            test2: unionTest(output: "OtherStuff") {
              ... on TestInterface {
                kind
                testString
              }
              ... on TestImpl1 {
                foo
              }
              ... on UnionImpl {
                someField
              }
            }
          }
        `;
        const mergedResult = await graphql(mergedSchema, query);
        expect(mergedResult).to.deep.equal({
          data: {
            test1: {
              kind: 'ONE',
              testString: 'test',
              foo: 'foo',
            },
            test2: {
              someField: 'Bar',
            },
          },
        });
      });

      it('interfaces spread from top level functions', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              first: customerById(id: "c1") {
                name
                ... on Node {
                  id
                }
              }

              second: customerById(id: "c1") {
                ...NodeFragment
              }
            }

            fragment NodeFragment on Node {
              id
              ... on Customer {
                name
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            first: {
              id: 'c1',
              name: 'Exampler Customer',
            },
            second: {
              id: 'c1',
              name: 'Exampler Customer',
            },
          },
        });
      });

      it('unions implementing an interface', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              customerById(id: "c1") {
                ... on Person {
                  name
                }
                vehicle {
                  ... on Node {
                    __typename
                    id
                  }
                }
                secondVehicle: vehicle {
                  ...NodeFragment
                }
              }
            }

            fragment NodeFragment on Node {
              id
              __typename
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            customerById: {
              name: 'Exampler Customer',
              vehicle: { __typename: 'Bike', id: 'v1' },
              secondVehicle: { __typename: 'Bike', id: 'v1' },
            },
          },
        });
      });

      it('input objects with default', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              one: defaultInputTest(input: {})
              two: defaultInputTest(input: { test: "Bar" })
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            one: 'Foo',
            two: 'Bar',
          },
        });
      });

      it('deep links', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p2") {
                id
                name
                bookings {
                  id
                  customer {
                    name
                  }
                  property {
                    id
                    name
                  }
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p2',
              name: 'Another great hotel',
              bookings: [
                {
                  id: 'b4',
                  customer: {
                    name: 'Exampler Customer',
                  },
                  property: {
                    id: 'p2',
                    name: 'Another great hotel',
                  },
                },
              ],
            },
          },
        });
      });

      it('link arguments', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p1") {
                id
                name
                bookings(limit: 1) {
                  id
                  customer {
                    name
                  }
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p1',
              name: 'Super great hotel',
              bookings: [
                {
                  id: 'b1',
                  customer: {
                    name: 'Exampler Customer',
                  },
                },
              ],
            },
          },
        });
      });

      it('removes `isTypeOf` checks from proxied schemas', () => {
        const Booking = mergedSchema.getType('Booking') as GraphQLObjectType;
        expect(Booking.isTypeOf).to.equal(undefined);
      });

      it('should merge resolvers when passed an array of resolver objects', async () => {
        const Scalars = {
          TestScalar: new GraphQLScalarType({
            name: 'TestScalar',
            description: undefined,
            serialize: value => value,
            parseValue: value => value,
            parseLiteral: () => null,
          }),
        };
        const Enums = {
          NumericEnum: {
            TEST: 1,
          },
          Color: {
            RED: '#EA3232',
          },
        };
        const PropertyResolvers: IResolvers = {
          Property: {
            bookings: {
              fragment: 'fragment PropertyFragment on Property { id }',
              resolve(parent, args, context, info) {
                return delegateToSchema({
                  schema: bookingSchema,
                  operation: 'query',
                  fieldName: 'bookingsByPropertyId',
                  args: {
                    propertyId: parent.id,
                    limit: args.limit ? args.limit : null,
                  },
                  context,
                  info,
                });
              },
            },
          },
        };
        const LinkResolvers: IResolvers = {
          Booking: {
            property: {
              fragment: 'fragment BookingFragment on Booking { propertyId }',
              resolve(parent, args, context, info) {
                return delegateToSchema({
                  schema: propertySchema,
                  operation: 'query',
                  fieldName: 'propertyById',
                  args: {
                    id: parent.propertyId,
                  },
                  context,
                  info,
                });
              },
            },
          },
        };
        const Query1 = {
          Query: {
            color() {
              return '#EA3232';
            },
            numericEnum() {
              return 1;
            },
          },
        };
        const Query2: IResolvers = {
          Query: {
            delegateInterfaceTest(parent, args, context, info) {
              return delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'interfaceTest',
                args: {
                  kind: 'ONE',
                },
                context,
                info,
              });
            },
            delegateArgumentTest(parent, args, context, info) {
              return delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'propertyById',
                args: {
                  id: 'p1',
                },
                context,
                info,
              });
            },
            linkTest() {
              return {
                test: 'test',
              };
            },
            node: {
              // fragment doesn't work
              fragment: 'fragment NodeFragment on Node { id }',
              resolve(parent, args, context, info) {
                if (args.id.startsWith('p')) {
                  return delegateToSchema({
                    schema: propertySchema,
                    operation: 'query',
                    fieldName: 'propertyById',
                    args,
                    context,
                    info,
                  });
                } else if (args.id.startsWith('b')) {
                  return delegateToSchema({
                    schema: bookingSchema,
                    operation: 'query',
                    fieldName: 'bookingById',
                    args,
                    context,
                    info,
                  });
                } else if (args.id.startsWith('c')) {
                  return delegateToSchema({
                    schema: bookingSchema,
                    operation: 'query',
                    fieldName: 'customerById',
                    args,
                    context,
                    info,
                  });
                } else {
                  throw new Error('invalid id');
                }
              },
            },
          },
        };

        const AsyncQuery: IResolvers = {
          Query: {
            async nodes(parent, args, context, info) {
              const bookings = await delegateToSchema({
                schema: bookingSchema,
                operation: 'query',
                fieldName: 'bookings',
                context,
                info,
              });
              const properties = await delegateToSchema({
                schema: propertySchema,
                operation: 'query',
                fieldName: 'properties',
                context,
                info,
              });
              return [...bookings, ...properties];
            },
          },
        };
        const schema = mergeSchemas({
          schemas: [
            propertySchema,
            bookingSchema,
            productSchema,
            scalarTest,
            enumSchema,
            linkSchema,
            loneExtend,
            localSubscriptionSchema,
          ],
          resolvers: [
            Scalars,
            Enums,
            PropertyResolvers,
            LinkResolvers,
            Query1,
            Query2,
            AsyncQuery,
          ],
        });

        const mergedResult = await graphql(
          schema,
          `
            query {
              dateTimeTest
              test1: jsonTest(input: { foo: "bar" })
              test2: jsonTest(input: 5)
              test3: jsonTest(input: "6")
            }
          `,
        );
        const expected = {
          data: {
            dateTimeTest: '1987-09-25T12:00:00',
            test1: { foo: 'bar' },
            test2: 5,
            test3: '6',
          },
        };
        expect(mergedResult).to.deep.equal(expected);
      });
    });

    describe('fragments', () => {
      it('named', async () => {
        const propertyFragment = `
fragment PropertyFragment on Property {
  id
  name
  location {
    name
  }
}
    `;
        const bookingFragment = `
fragment BookingFragment on Booking {
  id
  customer {
    name
  }
  startTime
  endTime
}
    `;

        const propertyResult = await graphql(
          localPropertySchema,
          `
            ${propertyFragment}
            query {
              propertyById(id: "p1") {
                ...PropertyFragment
              }
            }
          `,
        );

        const bookingResult = await graphql(
          localBookingSchema,
          `
            ${bookingFragment}
            query {
              bookingById(id: "b1") {
                ...BookingFragment
              }
            }
          `,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            ${bookingFragment}
            ${propertyFragment}

            query {
              propertyById(id: "p1") {
                ...PropertyFragment
              }
              bookingById(id: "b1") {
                ...BookingFragment
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            ...propertyResult.data,
            ...bookingResult.data,
          },
        });
      });

      it('inline', async () => {
        const propertyFragment = `
propertyById(id: "p1") {
  ... on Property {
    id
  }
  name
}
  `;
        const bookingFragment = `
bookingById(id: "b1") {
  id
  ... on Booking {
    customer {
      name
    }
    startTime
    endTime
  }
}
  `;

        const propertyResult = await graphql(
          localPropertySchema,
          `query { ${propertyFragment} }`,
        );

        const bookingResult = await graphql(
          localBookingSchema,
          `query { ${bookingFragment} }`,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `query {
      ${propertyFragment}
      ${bookingFragment}
    }`,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            ...propertyResult.data,
            ...bookingResult.data,
          },
        });
      });

      it('containing links', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p2") {
                id
                ... on Property {
                  name
                  bookings {
                    id
                    customer {
                      name
                    }
                    ...BookingFragment
                  }
                }
              }
            }

            fragment BookingFragment on Booking {
              property {
                ...PropertyFragment
              }
            }

            fragment PropertyFragment on Property {
              id
              name
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p2',
              name: 'Another great hotel',
              bookings: [
                {
                  id: 'b4',
                  customer: {
                    name: 'Exampler Customer',
                  },
                  property: {
                    id: 'p2',
                    name: 'Another great hotel',
                  },
                },
              ],
            },
          },
        });
      });

      it('overlapping selections', async () => {
        const propertyFragment1 = `
fragment PropertyFragment1 on Property {
  id
  name
  location {
    name
  }
}
    `;
        const propertyFragment2 = `
fragment PropertyFragment2 on Property {
  id
  name
  location {
    name
  }
}
    `;
        const bookingFragment = `
fragment BookingFragment on Booking {
  id
  customer {
    name
  }
  startTime
  endTime
}
    `;

        const propertyResult = await graphql(
          localPropertySchema,
          `
            ${propertyFragment1}
            ${propertyFragment2}
            query {
              propertyById(id: "p1") {
                ...PropertyFragment1
                ...PropertyFragment2
              }
            }
          `,
        );

        const bookingResult = await graphql(
          localBookingSchema,
          `
            ${bookingFragment}
            query {
              bookingById(id: "b1") {
                ...BookingFragment
              }
            }
          `,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            ${bookingFragment}
            ${propertyFragment1}
            ${propertyFragment2}

            query {
              propertyById(id: "p1") {
                ...PropertyFragment1
                ...PropertyFragment2
              }
              bookingById(id: "b1") {
                ...BookingFragment
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            ...propertyResult.data,
            ...bookingResult.data,
          },
        });
      });

      it('containing fragment on outer type', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p2") {
                id
                ... on Property {
                  name
                  ...BookingFragment1
                }
              }
            }

            fragment BookingFragment1 on Property {
              bookings {
                id
                property {
                  id
                  name
                }
              }
              ...BookingFragment2
            }

            fragment BookingFragment2 on Property {
              bookings {
                customer {
                  name
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p2',
              name: 'Another great hotel',
              bookings: [
                {
                  id: 'b4',
                  customer: {
                    name: 'Exampler Customer',
                  },
                  property: {
                    id: 'p2',
                    name: 'Another great hotel',
                  },
                },
              ],
            },
          },
        });
      });

      it('containing links and overlapping fragments on relation', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p2") {
                id
                ... on Property {
                  name
                  ...BookingFragment1
                  ...BookingFragment2
                }
              }
            }

            fragment BookingFragment1 on Property {
              bookings {
                id
                property {
                  id
                  name
                }
              }
            }

            fragment BookingFragment2 on Property {
              bookings {
                customer {
                  name
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p2',
              name: 'Another great hotel',
              bookings: [
                {
                  id: 'b4',
                  customer: {
                    name: 'Exampler Customer',
                  },
                  property: {
                    id: 'p2',
                    name: 'Another great hotel',
                  },
                },
              ],
            },
          },
        });
      });

      it('containing links and single fragment on relation', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p2") {
                id
                ... on Property {
                  name
                  ...BookingFragment
                }
              }
            }

            fragment BookingFragment on Property {
              bookings {
                id
                customer {
                  name
                }
                property {
                  id
                  name
                }
              }
            }
          `,
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p2',
              name: 'Another great hotel',
              bookings: [
                {
                  id: 'b4',
                  customer: {
                    name: 'Exampler Customer',
                  },
                  property: {
                    id: 'p2',
                    name: 'Another great hotel',
                  },
                },
              ],
            },
          },
        });
      });
    });

    describe('variables', () => {
      it('basic', async () => {
        const propertyFragment = `
          propertyById(id: $p1) {
            id
            name
          }
        `;
        const bookingFragment = `
          bookingById(id: $b1) {
            id
            customer {
              name
            }
            startTime
            endTime
          }
        `;

        const propertyResult = await graphql(
          localPropertySchema,
          `query($p1: ID!) { ${propertyFragment} }`,
          {},
          {},
          {
            p1: 'p1',
          },
        );

        const bookingResult = await graphql(
          localBookingSchema,
          `query($b1: ID!) { ${bookingFragment} }`,
          {},
          {},
          {
            b1: 'b1',
          },
        );

        const mergedResult = await graphql(
          mergedSchema,
          `query($p1: ID!, $b1: ID!) {
        ${propertyFragment}
        ${bookingFragment}
      }`,
          {},
          {},
          {
            p1: 'p1',
            b1: 'b1',
          },
        );

        expect(mergedResult).to.deep.equal({
          data: {
            ...propertyResult.data,
            ...bookingResult.data,
          },
        });
      });

      it('in link selections', async () => {
        const mergedResult = await graphql(
          mergedSchema,
          `
            query($limit: Int) {
              propertyById(id: "p1") {
                id
                name
                ... on Property {
                  ...BookingFragment
                }
              }
            }

            fragment BookingFragment on Property {
              bookings(limit: $limit) {
                id
                customer {
                  name
                  ... on Person {
                    id
                  }
                }
              }
            }
          `,
          {},
          {},
          {
            limit: 1,
          },
        );

        expect(mergedResult).to.deep.equal({
          data: {
            propertyById: {
              id: 'p1',
              name: 'Super great hotel',
              bookings: [
                {
                  id: 'b1',
                  customer: {
                    name: 'Exampler Customer',
                    id: 'c1',
                  },
                },
              ],
            },
          },
        });
      });
    });

    describe('aliases', () => {
      it('aliases', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              property: propertyById(id: "p1") {
                id
                propertyId: id
                secondAlias: id
                firstReservation: bookings(limit: 1) {
                  id
                }
                reservations: bookings {
                  bookingId: id
                  user: customer {
                    customerId: id
                  }
                  hotel: property {
                    propertyId: id
                  }
                }
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            property: {
              id: 'p1',
              propertyId: 'p1',
              secondAlias: 'p1',
              firstReservation: [
                {
                  id: 'b1',
                },
              ],
              reservations: [
                {
                  bookingId: 'b1',
                  user: {
                    customerId: 'c1',
                  },
                  hotel: {
                    propertyId: 'p1',
                  },
                },
                {
                  bookingId: 'b2',
                  hotel: {
                    propertyId: 'p1',
                  },
                  user: {
                    customerId: 'c2',
                  },
                },
                {
                  bookingId: 'b3',
                  hotel: {
                    propertyId: 'p1',
                  },
                  user: {
                    customerId: 'c3',
                  },
                },
              ],
            },
          },
        });
      });

      it('aliases subschema queries', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              customerById(id: "c1") {
                id
                firstBooking: bookings(limit: 1) {
                  id
                  property {
                    id
                  }
                }
                allBookings: bookings(limit: 10) {
                  id
                  property {
                    id
                  }
                }
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            customerById: {
              id: 'c1',
              firstBooking: [
                {
                  id: 'b1',
                  property: {
                    id: 'p1',
                  },
                },
              ],
              allBookings: [
                {
                  id: 'b1',
                  property: {
                    id: 'p1',
                  },
                },
                {
                  id: 'b4',
                  property: {
                    id: 'p2',
                  },
                },
              ],
            },
          },
        });
      });
    });

    describe('errors', () => {
      it('root level', async () => {
        const propertyFragment = `
                errorTest
              `;
        const bookingFragment = `
          bookingById(id: "b1") {
            id
            customer {
              name
            }
            startTime
            endTime
          }
        `;

        const propertyResult = await graphql(
          localPropertySchema,
          `query {
                  ${propertyFragment}
                }`,
        );

        const bookingResult = await graphql(
          localBookingSchema,
          `query {
                  ${bookingFragment}
                }`,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `query {
            ${propertyFragment}
            ${bookingFragment}
          }`,
        );
        expect(mergedResult.data).to.deep.equal({
          ...propertyResult.data,
          ...bookingResult.data,
        });
        expect(mergedResult.errors.map(removeLocations)).to.deep.equal(
          propertyResult.errors.map(removeLocations));

        const mergedResult2 = await graphql(
          mergedSchema,
          `
                query {
                  errorTestNonNull
                  ${bookingFragment}
                }
              `,
        );

        expect(mergedResult2.data).to.equal(null);
        expect(mergedResult2.errors.map(removeLocations)).to.deep.equal([
          {
            message: 'Sample error non-null!',
            path: ['errorTestNonNull'],
          },
        ]);
      });

      it('nested errors', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p1") {
                error
                errorAlias: error
                bookings {
                  id
                  error
                  bookingErrorAlias: error
                }
              }
            }
          `,
        );

        expect(result.data).to.deep.equal({
          propertyById: {
            bookings: [
              {
                bookingErrorAlias: null,
                error: null,
                id: 'b1',
              },
              {
                bookingErrorAlias: null,
                error: null,
                id: 'b2',
              },
              {
                bookingErrorAlias: null,
                error: null,
                id: 'b3',
              },
            ],
            error: null,
            errorAlias: null,
          }
        });
        expect(result.errors.map(removeLocations)).to.deep.equal([
          {
            extensions: {
              code: 'SOME_CUSTOM_CODE'
            },
            message: 'Property.error error',
            path: ['propertyById', 'error'],
          },
          {
            extensions: {
              code: 'SOME_CUSTOM_CODE'
            },
            message: 'Property.error error',
            path: ['propertyById', 'errorAlias'],
          },
          {
            message: 'Booking.error error',
            path: ['propertyById', 'bookings', 0, 'error'],
          },
          {
            message: 'Booking.error error',
            path: ['propertyById', 'bookings', 0, 'bookingErrorAlias'],
          },
          {
            message: 'Booking.error error',
            path: ['propertyById', 'bookings', 1, 'error'],
          },
          {
            message: 'Booking.error error',
            path: ['propertyById', 'bookings', 1, 'bookingErrorAlias'],
          },
          {
            message: 'Booking.error error',
            path: ['propertyById', 'bookings', 2, 'error'],
          },
          {
            message: 'Booking.error error',
            path: ['propertyById', 'bookings', 2, 'bookingErrorAlias'],
          }
        ]);
      });

      it(
        'should preserve custom error extensions from the original schema, ' +
        'when merging schemas',
        async () => {
          const propertyQuery = `
            query {
              properties(limit: 1) {
                error
              }
            }
          `;

          const propertyResult = await graphql(
            localPropertySchema,
            propertyQuery,
          );

          const mergedResult = await graphql(
            mergedSchema,
            propertyQuery,
          );

          [propertyResult, mergedResult].forEach((result) => {
            expect(result.errors).to.exist;
            expect(result.errors.length > 0).to.be.true;
            const error = result.errors[0];
            expect(error.extensions).to.exist;
            expect(error.extensions.code).to.equal('SOME_CUSTOM_CODE');
          });
        }
      );
    });

    describe('types in schema extensions', () => {
      it('should parse descriptions on new types', () => {
        expect(mergedSchema.getType('AnotherNewScalar').description).to.equal(
          'Description of AnotherNewScalar.',
        );

        expect(mergedSchema.getType('TestingScalar').description).to.equal(
          'A type that uses TestScalar.',
        );

        expect(mergedSchema.getType('Color').description).to.equal(
          'A type that uses an Enum.',
        );

        expect(mergedSchema.getType('NumericEnum').description).to.equal(
          'A type that uses an Enum with a numeric constant.',
        );

        expect(mergedSchema.getType('LinkType').description).to.equal(
          'A new type linking the Property type.',
        );

        expect(mergedSchema.getType('LinkType').description).to.equal(
          'A new type linking the Property type.',
        );
      });

      it('should parse descriptions on new fields', () => {
        const Query = mergedSchema.getQueryType();
        expect(Query.getFields().linkTest.description).to.equal(
          'A new field on the root query.',
        );

        const Booking = mergedSchema.getType('Booking') as GraphQLObjectType;
        expect(Booking.getFields().property.description).to.equal(
          'The property of the booking.',
        );

        const Property = mergedSchema.getType('Property') as GraphQLObjectType;
        const bookingsField = Property.getFields().bookings;
        expect(bookingsField.description).to.equal('A list of bookings.');
        expect(bookingsField.args[0].description).to.equal(
          'The maximum number of bookings to retrieve.',
        );
      });

      it('should allow defining new types in link type', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              linkTest {
                test
                property {
                  id
                }
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            linkTest: {
              test: 'test',
              property: {
                id: 'p1',
              },
            },
          },
        });
      });
    });

    describe('merge info defined interfaces', () => {
      it('inline fragments on existing types in subschema', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query($pid: ID!, $bid: ID!) {
              property: node(id: $pid) {
                id
                ... on Property {
                  name
                }
              }
              booking: node(id: $bid) {
                id
                ... on Booking {
                  startTime
                  endTime
                }
              }
            }
          `,
          {},
          {},
          {
            pid: 'p1',
            bid: 'b1',
          },
        );

        expect(result).to.deep.equal({
          data: {
            property: {
              id: 'p1',
              name: 'Super great hotel',
            },
            booking: {
              id: 'b1',
              startTime: '2016-05-04',
              endTime: '2016-06-03',
            },
          },
        });
      });

      it('inline fragments on non-compatible sub schema types', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query($bid: ID!) {
              node(id: $bid) {
                __typename
                id
                ... on Property {
                  name
                }
                ... on Booking {
                  startTime
                  endTime
                }
                ... on Customer {
                  name
                }
              }
            }
          `,
          {},
          {},
          {
            bid: 'b1',
          },
        );

        expect(result).to.deep.equal({
          data: {
            node: {
              __typename: 'Booking',
              id: 'b1',
              startTime: '2016-05-04',
              endTime: '2016-06-03',
            },
          },
        });
      });

      it('fragments on non-compatible sub schema types', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query($bid: ID!) {
              node(id: $bid) {
                __typename
                id
                ...PropertyFragment
                ...BookingFragment
                ...CustomerFragment
              }
            }

            fragment PropertyFragment on Property {
              name
            }

            fragment BookingFragment on Booking {
              startTime
              endTime
            }

            fragment CustomerFragment on Customer {
              name
            }
          `,
          {},
          {},
          {
            bid: 'b1',
          },
        );

        expect(result).to.deep.equal({
          data: {
            node: {
              __typename: 'Booking',
              id: 'b1',
              startTime: '2016-05-04',
              endTime: '2016-06-03',
            },
          },
        });
      });

      it('fragments on interfaces in merged schema', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query($bid: ID!) {
              node(id: $bid) {
                ...NodeFragment
              }
            }

            fragment NodeFragment on Node {
              id
              ... on Property {
                name
              }
              ... on Booking {
                startTime
                endTime
              }
            }
          `,
          {},
          {},
          {
            bid: 'b1',
          },
        );

        expect(result).to.deep.equal({
          data: {
            node: {
              id: 'b1',
              startTime: '2016-05-04',
              endTime: '2016-06-03',
            },
          },
        });
      });

      it('multi-interface filter', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              products {
                id
                __typename
                ... on Sellable {
                  price
                }
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            products: [
              {
                id: 'pd1',
                __typename: 'SimpleProduct',
                price: 100,
              },
              {
                id: 'pd2',
                __typename: 'DownloadableProduct',
              },
            ],
          },
        });
      });

      it('interface extensions', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              products {
                id
                __typename
                ... on Downloadable {
                  filesize
                }
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            products: [
              {
                id: 'pd1',
                __typename: 'SimpleProduct',
              },
              {
                id: 'pd2',
                __typename: 'DownloadableProduct',
                filesize: 1024,
              },
            ],
          },
        });
      });

      it('arbitrary transforms that return interfaces', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              nodes {
                id
                ... on Property {
                  name
                }
                ... on Booking {
                  startTime
                  endTime
                }
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            nodes: [
              {
                id: 'b1',
                startTime: '2016-05-04',
                endTime: '2016-06-03',
              },
              {
                id: 'b2',
                startTime: '2016-06-04',
                endTime: '2016-07-03',
              },
              {
                id: 'b3',
                startTime: '2016-08-04',
                endTime: '2016-09-03',
              },
              {
                id: 'b4',
                startTime: '2016-10-04',
                endTime: '2016-10-03',
              },
              {
                id: 'p1',
                name: 'Super great hotel',
              },
              {
                id: 'p2',
                name: 'Another great hotel',
              },
              {
                id: 'p3',
                name: 'BedBugs - The Affordable Hostel',
              },
            ],
          },
        });
      });
    });

    describe('schema directives', () => {
      it('should work with schema directives', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              propertyById(id: "p1") {
                someField
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            propertyById: {
              someField: 'SOMEFIELD',
            },
          },
        });
      });
    });

    describe('regression', () => {
      it('should not pass extra arguments to delegates', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              delegateArgumentTest(arbitraryArg: 5) {
                id
              }
            }
          `,
        );

        expect(result).to.deep.equal({
          data: {
            delegateArgumentTest: {
              id: 'p1',
            },
          },
        });
      });

      it('defaultMergedResolver should work with aliases if parent merged resolver is manually overwritten', async () => {
        // Source: https://github.com/apollographql/graphql-tools/issues/967
        const typeDefs = `
          type Query {
            book: Book
          }
          type Book {
            category: String!
          }
        `;
        let schema = makeExecutableSchema({ typeDefs });

        const resolvers = {
          Query: {
            book: () => ({ category: 'Test' })
          }
        };

        schema = mergeSchemas({
          schemas: [schema],
          resolvers
        });

        const result = await graphql(
          schema,
          `{ book { cat: category } }`,
        );

        expect(result.data.book.cat).to.equal('Test');
      });
    });

    describe('deprecation', () => {
      it('should retain deprecation information', async () => {
        const typeDefs = `
          type Query {
            book: Book
          }
          type Book {
            category: String! @deprecated(reason: "yolo")
          }
        `;

        const query = `query {
          book {
            category
          }
        }`;

        const resolvers = {
          Query: {
            book: () => ({ category: 'Test' })
          }
        };

        const schema = mergeSchemas({
          schemas: [propertySchema, typeDefs],
          resolvers
        });

        const deprecatedUsages = findDeprecatedUsages(schema, parse(query));
        expect(deprecatedUsages).not.empty;
        expect(deprecatedUsages.length).to.equal(1);
        expect(deprecatedUsages.find(error => Boolean(error && error.message.match(/deprecated/) && error.message.match(/yolo/))));
      });
    });
  });

  describe('scalars without executable schema', () => {
    it('can merge and query schema', async () => {
      const BookSchema = `
        type Book {
          name: String
        }
      `;

      const AuthorSchema = `
        type Query {
          book: Book
        }

        type Author {
          name: String
        }

        type Book {
          author: Author
        }
      `;

      const resolvers = {
        Query: {
          book: () => ({
            author: {
              name: 'JRR Tolkien',
            },
          }),
        },
      };

      const result = await graphql(
        mergeSchemas({ schemas: [BookSchema, AuthorSchema], resolvers }),
        `
          query {
            book {
              author {
                name
              }
            }
          }
        `,
        {},
        {
          test: 'Foo',
        },
      );

      expect(result).to.deep.equal({
        data: {
          book: {
            author: {
              name: 'JRR Tolkien',
            },
          },
        },
      });
    });
  });
});
