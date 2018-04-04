/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import { graphql, GraphQLSchema } from 'graphql';
import mergeSchemas from '../stitching/mergeSchemas';
import { Transforms, transformSchema } from '../transforms';
import { propertySchema, bookingSchema } from './testingSchemas';

let linkSchema = `
  """
  A new type linking the Property type.
  """
  type LinkType {
    test: String
    """
    The property.
    """
    property: Properties_Property
  }

  interface Node {
    id: ID!
  }

  extend type Bookings_Booking implements Node {
    """
    The property of the booking.
    """
    property: Properties_Property
  }

  extend type Properties_Property implements Node {
    """
    A list of bookings.
    """
    bookings(
      """
      The maximum number of bookings to retrieve.
      """
      limit: Int
    ): [Bookings_Booking]
  }

  extend type Query {
    linkTest: LinkType
    node(id: ID!): Node
    nodes: [Node]
  }

  extend type Bookings_Customer implements Node
`;

describe('merge schemas through transforms', () => {
  let mergedSchema: GraphQLSchema;

  before(async () => {
    // namespace and strip schemas
    const transformedPropertySchema = transformSchema(propertySchema, [
      Transforms.FilterRootFields((operation: string, rootField: string) =>
        ['Query.properties'].includes(`${operation}.${rootField}`),
      ),
      Transforms.RenameTypes((name: string) => `Properties_${name}`),
      Transforms.RenameRootFields((name: string) => `Properties_${name}`),
    ]);
    const transformedBookingSchema = transformSchema(bookingSchema, [
      Transforms.FilterRootFields((operation: string, rootField: string) =>
        ['Query.bookings'].includes(`${operation}.${rootField}`),
      ),
      Transforms.RenameTypes((name: string) => `Bookings_${name}`),
      Transforms.RenameRootFields(
        (operation: string, name: string) => `Bookings_${name}`,
      ),
    ]);

    mergedSchema = mergeSchemas({
      schemas: [
        transformedPropertySchema,
        transformedBookingSchema,
        linkSchema,
      ],
      resolvers: {
        Query: {
          // delegating directly, no subschemas or mergeInfo
          node(parent, args, context, info) {
            if (args.id.startsWith('p')) {
              return info.mergeInfo.delegateToSchema(
                propertySchema,
                'query',
                'propertyById',
                args,
                context,
                info,
                transformedPropertySchema.transforms,
              );
            } else if (args.id.startsWith('b')) {
              return info.mergeInfo.delegateToSchema(
                bookingSchema,
                'query',
                'bookingById',
                args,
                context,
                info,
                transformedBookingSchema.transforms,
              );
            } else if (args.id.startsWith('c')) {
              return info.mergeInfo.delegateToSchema(
                bookingSchema,
                'query',
                'customerById',
                args,
                context,
                info,
                transformedBookingSchema.transforms,
              );
            } else {
              throw new Error('invalid id');
            }
          },
        },
        Properties_Property: {
          bookings: {
            fragment: 'fragment PropertyFragment on Property { id }',
            resolve(parent, args, context, info) {
              return info.mergeInfo.delegateToSchema(
                bookingSchema,
                'query',
                'bookingsByPropertyId',
                {
                  propertyId: parent.id,
                  limit: args.limit ? args.limit : null,
                },
                context,
                info,
                transformedBookingSchema.transforms,
              );
            },
          },
        },
        Bookings_Booking: {
          property: {
            fragment: 'fragment BookingFragment on Booking { propertyId }',
            resolve(parent, args, context, info) {
              return info.mergeInfo.delegateToSchema(
                propertySchema,
                'query',
                'propertyById',
                {
                  id: parent.propertyId,
                },
                context,
                info,
                transformedPropertySchema.transforms,
              );
            },
          },
        },
      },
    });
  });

  // FIXME fragemnt replacements
  it('node should work', async () => {
    const result = await graphql(
      mergedSchema,
      `
        query($pid: ID!, $bid: ID!) {
          property: node(id: $pid) {
            __typename
            ... on Properties_Property {
              name
              bookings {
                startTime
                endTime
              }
            }
          }
          booking: node(id: $bid) {
            __typename
            ... on Bookings_Booking {
              startTime
              endTime
              property {
                id
                name
              }
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
        booking: {
          __typename: 'Bookings_Booking',
          endTime: '2016-06-03',
          property: {
            id: 'p1',
            name: 'Super great hotel',
          },
          startTime: '2016-05-04',
        },
        property: {
          __typename: 'Properties_Property',
          bookings: [
            {
              endTime: '2016-06-03',
              startTime: '2016-05-04',
            },
            {
              endTime: '2016-07-03',
              startTime: '2016-06-04',
            },
            {
              endTime: '2016-09-03',
              startTime: '2016-08-04',
            },
          ],
          name: 'Super great hotel',
        },
      },
    });
  });
});
