import { GraphQLSchema, graphql } from 'graphql';

import { delegateToSchema } from '../delegate/delegateToSchema';
import { stitchSchemas } from '../stitch/stitchSchemas';
import { IResolvers } from '../Interfaces';
import { makeExecutableSchema } from '../generate';
import { wrapSchema } from '../wrap';

import {
  propertySchema,
  bookingSchema,
  sampleData,
  Property,
} from './fixtures/schemas';

function findPropertyByLocationName(
  properties: Record<string, Property>,
  name: string,
): Property | undefined {
  for (const key of Object.keys(properties)) {
    const property = properties[key];
    if (property.location.name === name) {
      return property;
    }
  }
}

const COORDINATES_QUERY = `
  query BookingCoordinates($bookingId: ID!) {
    bookingById (id: $bookingId) {
      property {
        location {
          coordinates
        }
      }
    }
  }
`;

function proxyResolvers(spec: string): IResolvers {
  return {
    Booking: {
      property: {
        fragment: '... on Booking { propertyId }',
        resolve(booking, _args, context, info) {
          const delegateFn =
            spec === 'standalone'
              ? delegateToSchema
              : info.mergeInfo.delegateToSchema;
          return delegateFn?.({
            schema: propertySchema,
            operation: 'query',
            fieldName: 'propertyById',
            args: { id: booking.propertyId },
            context,
            info,
          });
        },
      },
    },
    Location: {
      coordinates: {
        fragment: '... on Location { name }',
        resolve: (location) => {
          const name = location.name;
          return findPropertyByLocationName(sampleData.Property, name).location
            .coordinates;
        },
      },
    },
  };
}

const proxyTypeDefs = `
  extend type Booking {
    property: Property!
  }
  extend type Location {
    coordinates: String!
  }
`;

describe('stitching', () => {
  describe('delegateToSchema', () => {
    ['standalone', 'info.mergeInfo'].forEach((spec) => {
      describe(spec, () => {
        let schema: GraphQLSchema;
        beforeAll(() => {
          schema = stitchSchemas({
            schemas: [bookingSchema, propertySchema, proxyTypeDefs],
            resolvers: proxyResolvers(spec),
          });
        });
        test('should add fragments for deep types', async () => {
          const result = await graphql(
            schema,
            COORDINATES_QUERY,
            {},
            {},
            { bookingId: 'b1' },
          );

          expect(result).toEqual({
            data: {
              bookingById: {
                property: {
                  location: {
                    coordinates: sampleData.Property.p1.location.coordinates,
                  },
                },
              },
            },
          });
        });
      });
    });
  });
});

describe('schema delegation', () => {
  test('should work even when there are default fields', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        scalar JSON
        type Data {
          json(input: JSON = "test"): JSON
        }
        type Query {
          data: Data
        }
      `,
      resolvers: {
        Query: {
          data: () => ({}),
        },
        Data: {
          json: (_root, args, context, info) =>
            delegateToSchema({
              schema: propertySchema,
              fieldName: 'jsonTest',
              args,
              context,
              info,
            }),
        },
      },
    });

    const result = await graphql(
      schema,
      `
        query {
          data {
            json
          }
        }
      `,
    );

    expect(result).toEqual({
      data: {
        data: {
          json: 'test',
        },
      },
    });
  });

  test('should work even with variables', async () => {
    const innerSchema = makeExecutableSchema({
      typeDefs: `
        type User {
          id(show: Boolean): ID
        }
        type Query {
          user: User
        }
      `,
      resolvers: {
        Query: {
          user: () => ({}),
        },
        User: {
          id: () => '123',
        },
      },
    });
    const schema = wrapSchema(innerSchema);

    const result = await graphql(
      schema,
      `
        query($show: Boolean) {
          user {
            id(show: $show)
          }
        }
      `,
      null,
      null,
      { show: true },
    );

    expect(result).toEqual({
      data: {
        user: {
          id: '123',
        },
      },
    });
  });
});
