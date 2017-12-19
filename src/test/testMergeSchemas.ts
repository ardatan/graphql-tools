/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import {
  graphql,
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLObjectType,
  subscribe,
  parse,
  ExecutionResult,
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
import { forAwaitEach } from 'iterall';
import { makeExecutableSchema } from '../schemaGenerator';

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
    testingScalar: TestingScalar
  }
`;

let enumTest = `
  """
  A type that uses an Enum.
  """
  enum Color {
    RED
  }

  schema {
    query: Query
  }

  type Query {
    color: Color
  }
`;

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

  extend type Booking implements Node {
    """
    The property of the booking.
    """
    property: Property
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

const loneExtend = `
  extend type Booking {
    foo: String!
  }
`;

if (process.env.GRAPHQL_VERSION === '^0.11') {
  scalarTest = `
    # Description of TestScalar.
    scalar TestScalar

    # Description of AnotherNewScalar.
    scalar AnotherNewScalar

    # A type that uses TestScalar.
    type TestingScalar {
      value: TestScalar
    }

    type Query {
      testingScalar: TestingScalar
    }
  `;

  enumTest = `
    # A type that uses an Enum.
    enum Color {
      RED
    }

    schema {
      query: Query
    }

    type Query {
      color: Color
    }
  `;

  linkSchema = `
    # A new type linking the Property type.
    type LinkType {
      test: String
      # The property.
      property: Property
    }

    interface Node {
      id: ID!
    }

    extend type Booking implements Node {
      # The property of the booking.
      property: Property
    }

    extend type Property implements Node {
      # A list of bookings.
      bookings(
        # The maximum number of bookings to retrieve.
        limit: Int
      ): [Booking]
    }

    extend type Query {
      delegateInterfaceTest: TestInterface
      delegateArgumentTest(arbitraryArg: Int): Property
      # A new field on the root query.
      linkTest: LinkType
      node(id: ID!): Node
      nodes: [Node]
    }

    extend type Customer implements Node {}
  `;
}

testCombinations.forEach(async combination => {
  describe('merging ' + combination.name, () => {
    let mergedSchema: GraphQLSchema,
      propertySchema: GraphQLSchema,
      productSchema: GraphQLSchema,
      bookingSchema: GraphQLSchema;

    before(async () => {
      propertySchema = await combination.property;
      bookingSchema = await combination.booking;
      productSchema = await combination.product;

      mergedSchema = mergeSchemas({
        schemas: [
          propertySchema,
          bookingSchema,
          productSchema,
          scalarTest,
          enumTest,
          linkSchema,
          loneExtend,
          localSubscriptionSchema,
        ],
        resolvers: {
          TestScalar: new GraphQLScalarType({
            name: 'TestScalar',
            description: undefined,
            serialize: value => value,
            parseValue: value => value,
            parseLiteral: () => null,
          }),
          Color: {
            RED: '#EA3232',
          },
          Property: {
            bookings: {
              fragment: 'fragment PropertyFragment on Property { id }',
              resolve(parent, args, context, info) {
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
              },
            },
          },
          Booking: {
            property: {
              fragment: 'fragment BookingFragment on Booking { propertyId }',
              resolve(parent, args, context, info) {
                return info.mergeInfo.delegate(
                  'query',
                  'propertyById',
                  {
                    id: parent.propertyId,
                  },
                  context,
                  info,
                );
              },
            },
          },
          LinkType: {
            property: {
              resolve(parent, args, context, info) {
                return info.mergeInfo.delegate(
                  'query',
                  'propertyById',
                  {
                    id: 'p1',
                  },
                  context,
                  info,
                );
              },
            },
          },
          Query: {
            color() {
              return '#EA3232';
            },
            delegateInterfaceTest(parent, args, context, info) {
              return info.mergeInfo.delegate(
                'query',
                'interfaceTest',
                {
                  kind: 'ONE',
                },
                context,
                info,
              );
            },
            delegateArgumentTest(parent, args, context, info) {
              return info.mergeInfo.delegate(
                'query',
                'propertyById',
                {
                  id: 'p1',
                },
                context,
                info,
              );
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
                  return info.mergeInfo.delegate(
                    'query',
                    'propertyById',
                    args,
                    context,
                    info,
                  );
                } else if (args.id.startsWith('b')) {
                  return info.mergeInfo.delegate(
                    'query',
                    'bookingById',
                    args,
                    context,
                    info,
                  );
                } else if (args.id.startsWith('c')) {
                  return info.mergeInfo.delegate(
                    'query',
                    'customerById',
                    args,
                    context,
                    info,
                  );
                } else {
                  throw new Error('invalid id');
                }
              },
            },
            async nodes(parent, args, context, info) {
              const bookings = await info.mergeInfo.delegate(
                'query',
                'bookings',
                {},
                context,
                info,
              );
              const properties = await info.mergeInfo.delegate(
                'query',
                'properties',
                {},
                context,
                info,
              );
              return [...bookings, ...properties];
            },
          },
        },
      });
    });

    describe('basic', () => {
      it('works with context', async () => {
        const propertyResult = await graphql(
          propertySchema,
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
          propertySchema,
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

      it('works with custom enums', async () => {
        const enumSchema = makeExecutableSchema({
          typeDefs: enumTest,
          resolvers: {
            Color: {
              RED: '#EA3232',
            },
            Query: {
              color() {
                return '#EA3232';
              },
            },
          },
        });
        const enumResult = await graphql(
          enumSchema,
          `
            query {
              color
            }
          `,
        );

        const mergedResult = await graphql(
          mergedSchema,
          `
            query {
              color
            }
          `,
        );

        expect(enumResult).to.deep.equal({
          data: {
            color: 'RED',
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
          propertySchema,
          `query { ${propertyFragment} }`,
        );

        const bookingResult = await graphql(
          bookingSchema,
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
          bookingSchema,
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
          })
          .catch(done);

        subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
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
        const propertyResult = await graphql(propertySchema, query);
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
          propertySchema,
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
          bookingSchema,
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
          propertySchema,
          `query { ${propertyFragment} }`,
        );

        const bookingResult = await graphql(
          bookingSchema,
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
          propertySchema,
          `query($p1: ID!) { ${propertyFragment} }`,
          {},
          {},
          {
            p1: 'p1',
          },
        );

        const bookingResult = await graphql(
          bookingSchema,
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
          propertySchema,
          `query {
                  ${propertyFragment}
                }`,
        );

        const bookingResult = await graphql(
          bookingSchema,
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
        expect(mergedResult).to.deep.equal({
          errors: propertyResult.errors,
          data: {
            ...propertyResult.data,
            ...bookingResult.data,
          },
        });

        const mergedResult2 = await graphql(
          mergedSchema,
          `
                query {
                  errorTestNonNull
                  ${bookingFragment}
                }
              `,
        );

        expect(mergedResult2).to.deep.equal({
          errors: [
            {
              locations: [
                {
                  column: 19,
                  line: 3,
                },
              ],
              message: 'Sample error non-null!',
              path: ['errorTestNonNull'],
            },
          ],
          data: null,
        });
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

        expect(result).to.deep.equal({
          data: {
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
            },
          },
          errors: [
            {
              locations: [
                {
                  column: 17,
                  line: 4,
                },
              ],
              message: 'Property.error error',
              path: ['propertyById', 'error'],
            },
            {
              locations: [
                {
                  column: 17,
                  line: 5,
                },
              ],
              message: 'Property.error error',
              path: ['propertyById', 'errorAlias'],
            },
            {
              locations: [
                {
                  column: 19,
                  line: 8,
                },
              ],
              message: 'Booking.error error',
              path: ['propertyById', 'bookings', 0, 'error'],
            },
            {
              locations: [
                {
                  column: 19,
                  line: 9,
                },
              ],
              message: 'Booking.error error',
              path: ['propertyById', 'bookings', 0, 'bookingErrorAlias'],
            },
            {
              locations: [
                {
                  column: 19,
                  line: 8,
                },
              ],
              message: 'Booking.error error',
              path: ['propertyById', 'bookings', 1, 'error'],
            },
            {
              locations: [
                {
                  column: 19,
                  line: 9,
                },
              ],
              message: 'Booking.error error',
              path: ['propertyById', 'bookings', 1, 'bookingErrorAlias'],
            },
            {
              locations: [
                {
                  column: 19,
                  line: 8,
                },
              ],
              message: 'Booking.error error',
              path: ['propertyById', 'bookings', 2, 'error'],
            },
            {
              locations: [
                {
                  column: 19,
                  line: 9,
                },
              ],
              message: 'Booking.error error',
              path: ['propertyById', 'bookings', 2, 'bookingErrorAlias'],
            },
          ],
        });
      });
    });

    describe('types in schema extensions', () => {
      it('should parse descriptions on new types', () => {
        // Because we redefine it via `GraphQLScalarType` above, it will get
        // its description from there.
        expect(mergedSchema.getType('TestScalar').description).to.be.undefined;

        expect(mergedSchema.getType('AnotherNewScalar').description).to.equal(
          'Description of AnotherNewScalar.',
        );

        expect(mergedSchema.getType('TestingScalar').description).to.equal(
          'A type that uses TestScalar.',
        );

        expect(mergedSchema.getType('Color').description).to.equal(
          'A type that uses an Enum.',
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

    // FIXME: __typename should be automatic
    describe('merge info defined interfaces', () => {
      it('inline fragments on existing types in subschema', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query($pid: ID!, $bid: ID!) {
              property: node(id: $pid) {
                __typename
                id
                ... on Property {
                  name
                }
              }
              booking: node(id: $bid) {
                __typename
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
              __typename: 'Property',
              id: 'p1',
              name: 'Super great hotel',
            },
            booking: {
              __typename: 'Booking',
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

      // KNOWN BUG
      // it('fragments on interfaces in merged schema', async () => {
      //   const result = await graphql(
      //     mergedSchema,
      //     `
      //       query($bid: ID!) {
      //         node(id: $bid) {
      //           ...NodeFragment
      //         }
      //       }
      //
      //       fragment NodeFragment on Node {
      //         id
      //         ... on Property {
      //           name
      //         }
      //         ... on Booking {
      //           startTime
      //           endTime
      //         }
      //       }
      //     `,
      //     {},
      //     {},
      //     {
      //       bid: 'b1',
      //     },
      //   );
      //
      //   expect(result).to.deep.equal({
      //     data: {
      //       node: {
      //         id: 'b1',
      //         startTime: '2016-05-04',
      //         endTime: '2016-06-03',
      //       },
      //     },
      //   });
      // });

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

      it('arbitrary transforms that return interfaces', async () => {
        const result = await graphql(
          mergedSchema,
          `
            query {
              nodes {
                __typename
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
                __typename: 'Booking',
              },
              {
                id: 'b2',
                startTime: '2016-06-04',
                endTime: '2016-07-03',
                __typename: 'Booking',
              },
              {
                id: 'b3',
                startTime: '2016-08-04',
                endTime: '2016-09-03',
                __typename: 'Booking',
              },
              {
                id: 'b4',
                startTime: '2016-10-04',
                endTime: '2016-10-03',
                __typename: 'Booking',
              },
              {
                id: 'p1',
                name: 'Super great hotel',
                __typename: 'Property',
              },
              {
                id: 'p2',
                name: 'Another great hotel',
                __typename: 'Property',
              },
              {
                id: 'p3',
                name: 'BedBugs - The Affordable Hostel',
                __typename: 'Property',
              },
            ],
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
    });
  });
});
