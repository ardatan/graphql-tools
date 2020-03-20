import { GraphQLSchema, graphql } from 'graphql';
import { expect } from 'chai';

import delegateToSchema from '../delegate/delegateToSchema';
import mergeSchemas from '../stitch/mergeSchemas';
import { IResolvers } from '../Interfaces';

import {
  propertySchema,
  bookingSchema,
  sampleData,
  Property,
} from './testingSchemas';

function findPropertyByLocationName(
  properties: { [key: string]: Property },
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
        resolve: location => {
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
    ['standalone', 'info.mergeInfo'].forEach(spec => {
      describe(spec, () => {
        let schema: GraphQLSchema;
        before(() => {
          schema = mergeSchemas({
            schemas: [bookingSchema, propertySchema, proxyTypeDefs],
            resolvers: proxyResolvers(spec),
          });
        });
        it('should add fragments for deep types', async () => {
          const result = await graphql(
            schema,
            COORDINATES_QUERY,
            {},
            {},
            { bookingId: 'b1' },
          );

          expect(result).to.deep.equal({
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
