import { GraphQLSchema, graphql } from 'graphql';

import { delegateToSchema } from '@graphql-tools/delegate';
import { IResolvers } from '@graphql-tools/utils';

import { stitchSchemas } from '../src/stitchSchemas';

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

const proxyResolvers: IResolvers = {
  Booking: {
    property: {
      selectionSet: '{ propertyId }',
      resolve(booking, _args, context, info) {
        return delegateToSchema({
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
      selectionSet: '{ name }',
      resolve: (location) => {
        const name = location.name;
        return findPropertyByLocationName(sampleData.Property, name).location
          .coordinates;
      },
    },
  },
};

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
    let schema: GraphQLSchema;
    beforeAll(() => {
      schema = stitchSchemas({
        schemas: [bookingSchema, propertySchema, proxyTypeDefs],
        resolvers: proxyResolvers,
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
