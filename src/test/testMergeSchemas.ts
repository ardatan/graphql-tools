/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import { graphql, GraphQLSchema, GraphQLScalarType } from 'graphql';
import mergeSchemas from '../stitching/mergeSchemas';
import {
  propertySchema as localPropertySchema,
  bookingSchema as localBookingSchema,
  remoteBookingSchema,
  remotePropertySchema,
} from './testingSchemas';

const testCombinations = [
  { name: 'local', booking: localBookingSchema, property: localPropertySchema },
  {
    name: 'remote',
    booking: remoteBookingSchema,
    property: remotePropertySchema,
  },
  {
    name: 'hybrid',
    booking: localBookingSchema,
    property: remotePropertySchema,
  },
];

const scalarTest = `
  scalar TestScalar

  type TestingScalar {
    value: TestScalar
  }

  type Query {
    testingScalar: TestingScalar
  }
`;

const linkSchema = `
  extend type Booking {
    property: Property
  }

  extend type Property {
    bookings(limit: Int): [Booking]
  }

  extend type Query {
    delegateInterfaceTest: TestInterface
  }
`;

testCombinations.forEach(async combination => {
  describe('merging ' + combination.name, () => {
    let mergedSchema: GraphQLSchema,
      propertySchema: GraphQLSchema,
      bookingSchema: GraphQLSchema;

    before(async () => {
      propertySchema = await combination.property;
      bookingSchema = await combination.booking;

      mergedSchema = mergeSchemas({
        schemas: [propertySchema, bookingSchema, scalarTest, linkSchema],
        onTypeConflict: (leftType, rightType) => leftType,
        resolvers: mergeInfo => ({
          TestScalar: new GraphQLScalarType({
            name: 'TestScalar',
            description: undefined,
            serialize: value => value,
            parseValue: value => value,
            parseLiteral: () => null,
          }),
          Property: {
            bookings: {
              fragment: 'fragment PropertyFragment on Property { id }',
              resolve(parent, args, context, info) {
                return mergeInfo.delegate(
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
                return mergeInfo.delegate(
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
          Query: {
            delegateInterfaceTest(parent, args, context, info) {
              return mergeInfo.delegate(
                'query',
                'interfaceTest',
                {
                  kind: 'ONE',
                },
                context,
                info,
              );
            },
          },
        }),
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

      it('handles errors', async () => {
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
                  column: 13,
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
  });
});
