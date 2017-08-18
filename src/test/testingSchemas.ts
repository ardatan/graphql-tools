import { values } from 'lodash';
import { GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';
import { IResolvers } from '../Interfaces';

export type Property = {
  id: string;
  name: string;
  location: {
    name: string;
  };
};

export type Booking = {
  id: string;
  propertyId: string;
  customerId: string;
  startTime: string;
  endTime: string;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  address?: string;
  vehicleId?: string;
};

export type Vehicle = {
  id: string;
  licensePlate?: string;
  bikeType?: 'MOUNTAIN' | 'ROAD';
};

export const sampleData: {
  Property: { [key: string]: Property };
  Booking: { [key: string]: Booking };
  Customer: { [key: string]: Customer };
  Vehicle: { [key: string]: Vehicle };
} = {
  Property: {
    p1: {
      id: 'p1',
      name: 'Super great hotel',
      location: {
        name: 'Helsinki',
      },
    },
    p2: {
      id: 'p2',
      name: 'Another great hotel',
      location: {
        name: 'San Francisco',
      },
    },
    p3: {
      id: 'p3',
      name: 'BedBugs - The Affordable Hostel',
      location: {
        name: 'Helsinki',
      },
    },
  },
  Booking: {
    b1: {
      id: 'b1',
      propertyId: 'p1',
      customerId: 'c1',
      startTime: '2016-05-04',
      endTime: '2016-06-03',
    },
    b2: {
      id: 'b2',
      propertyId: 'p1',
      customerId: 'c2',
      startTime: '2016-06-04',
      endTime: '2016-07-03',
    },
    b3: {
      id: 'b3',
      propertyId: 'p1',
      customerId: 'c3',
      startTime: '2016-08-04',
      endTime: '2016-09-03',
    },
    b4: {
      id: 'b4',
      propertyId: 'p2',
      customerId: 'c1',
      startTime: '2016-10-04',
      endTime: '2016-10-03',
    },
  },

  Customer: {
    c1: {
      id: 'c1',
      email: 'examplec1@example.com',
      name: 'Exampler Customer',
      vehicleId: 'v1',
    },
    c2: {
      id: 'c2',
      email: 'examplec2@example.com',
      name: 'Joe Doe',
      vehicleId: 'v2',
    },
    c3: {
      id: 'c3',
      email: 'examplec3@example.com',
      name: 'Liisa Esimerki',
      address: 'Esimerkikatu 1 A 77, 99999 Kyyjarvi',
    },
  },

  Vehicle: {
    v1: {
      id: 'v1',
      bikeType: 'MOUNTAIN',
    },
    v2: {
      id: 'v2',
      licensePlate: 'GRAPHQL',
    },
  },
};

const propertyTypeDefs = `
  type Property {
    id: ID!
    name: String!
    location: Location
  }

  type Location {
    name: String!
  }

  type Query {
    propertyById(id: ID!): Property
    properties(limit: Int): [Property!]
  }
`;

const propertyResolvers: IResolvers = {
  Query: {
    propertyById(root, { id }) {
      return sampleData.Property[id];
    },

    properties(root, { limit }) {
      const list = values(sampleData.Property);
      if (limit) {
        return list.slice(0, limit);
      } else {
        return list;
      }
    },
  },
};

const bookingTypeDefs = `
  type Booking {
    id: ID!
    propertyId: ID!
    customer: Customer!
    startTime: String!
    endTime: String!
  }

  interface Person {
    id: ID!
    name: String!
  }

  type Customer implements Person {
    id: ID!
    email: String!
    name: String!
    address: String
    bookings(limit: Int): [Booking!]
    vehicle: Vehicle
  }

  union Vehicle = Bike | Car

  type Bike {
    id: ID!
    bikeType: String
  }

  type Car {
    id: ID!
    licensePlate: String
  }

  type Query {
    bookingById(id: ID!): Booking
    bookingsByPropertyId(propertyId: ID!, limit: Int): [Booking!]
    customerById(id: ID!): Customer
    bookings(limit: Int): [Booking!]
    customers(limit: Int): [Customer!]
  }

  input BookingInput {
    propertyId: ID!
    customerId: ID!
    startTime: String!
    endTime: String!
  }

  type Mutation {
    addBooking(input: BookingInput): Booking
  }
`;

const bookingResolvers: IResolvers = {
  Query: {
    bookingById(parent, { id }) {
      return sampleData.Booking[id];
    },
    bookingsByPropertyId(parent, { propertyId, limit }) {
      const list = values(sampleData.Booking).filter(
        (booking: Booking) => booking.propertyId === propertyId,
      );
      if (limit) {
        return list.slice(0, limit);
      } else {
        return list;
      }
    },
    customerById(parent, { id }) {
      return sampleData.Customer[id];
    },
    bookings(parent, { limit }) {
      const list = values(sampleData.Booking);
      if (limit) {
        return list.slice(0, limit);
      } else {
        return list;
      }
    },
    customers(parent, { limit }) {
      const list = values(sampleData.Customer);
      if (limit) {
        return list.slice(0, limit);
      } else {
        return list;
      }
    },
  },

  Mutation: {
    addBooking(
      parent,
      { input: { propertyId, customerId, startTime, endTime } },
    ) {
      return {
        id: 'newId',
        propertyId,
        customerId,
        startTime,
        endTime,
      };
    },
  },

  Booking: {
    customer(parent: Booking) {
      return sampleData.Customer[parent.customerId];
    },
  },

  Customer: {
    bookings(parent: Customer) {
      return values(sampleData.Booking).filter(
        (booking: Booking) => booking.customerId === parent.id,
      );
    },
    vehicle(parent: Customer) {
      return sampleData.Vehicle[parent.vehicleId];
    },
  },

  Vehicle: {
    __resolveType(parent) {
      if (parent.licensePlate) {
        return 'Car';
      } else if (parent.bikeType) {
        return 'Bike';
      } else {
        throw new Error('Could not resolve Vehicle type');
      }
    },
  },
};

export const propertySchema: GraphQLSchema = makeExecutableSchema({
  typeDefs: propertyTypeDefs,
  resolvers: propertyResolvers,
});

export const bookingSchema: GraphQLSchema = makeExecutableSchema({
  typeDefs: bookingTypeDefs,
  resolvers: bookingResolvers,
});
