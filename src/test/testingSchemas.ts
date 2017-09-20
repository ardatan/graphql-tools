import { values } from 'lodash';
import {
  GraphQLSchema,
  graphql,
  Kind,
  GraphQLScalarType,
  ValueNode,
} from 'graphql';
import { makeExecutableSchema } from '../schemaGenerator';
import { IResolvers } from '../Interfaces';
import makeRemoteExecutableSchema from '../stitching/makeRemoteExecutableSchema';
import { Fetcher } from '../stitching/addSimpleRoutingResolvers';

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

function coerceString(value: any): string {
  if (Array.isArray(value)) {
    throw new TypeError(
      `String cannot represent an array value: [${String(value)}]`,
    );
  }
  return String(value);
}

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Simple fake datetime',
  serialize: coerceString,
  parseValue: coerceString,
  parseLiteral(ast) {
    return ast.kind === Kind.STRING ? ast.value : null;
  },
});

function identity(value: any): any {
  return value;
}

function parseLiteral(ast: ValueNode): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach(field => {
        value[field.name.value] = parseLiteral(field.value);
      });

      return value;
    }
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    default:
      return null;
  }
}

const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description:
    'The `JSON` scalar type represents JSON values as specified by ' +
    '[ECMA-404](http://www.ecma-international.org/' +
    'publications/files/ECMA-ST/ECMA-404.pdf).',
  serialize: identity,
  parseValue: identity,
  parseLiteral,
});

const addressTypeDef = `
  type Address {
    street: String
    city: String
    state: String
    zip: String
  }
`;

const propertyAddressTypeDef = `
  type Property {
    id: ID!
    name: String!
    location: Location
    address: Address
  }
`;

const propertyRootTypeDefs = `
  type Location {
    name: String!
  }

  type Query {
    propertyById(id: ID!): Property
    properties(limit: Int): [Property!]
    contextTest(key: String!): String
    dateTimeTest: DateTime
    jsonTest(input: JSON): JSON
  }
`;

const propertyAddressTypeDefs = `
  scalar DateTime
  scalar JSON

  ${addressTypeDef}
  ${propertyAddressTypeDef}
  ${propertyRootTypeDefs}
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

    contextTest(root, args, context) {
      return JSON.stringify(context[args.key]);
    },

    dateTimeTest() {
      return '1987-09-25T12:00:00';
    },

    jsonTest(root, { input }) {
      return input;
    },
  },
  DateTime,
  JSON: GraphQLJSON,
};

const customerAddressTypeDef = `
  type Customer implements Person {
    id: ID!
    email: String!
    name: String!
    address: Address
    bookings(limit: Int): [Booking!]
    vehicle: Vehicle
  }
`;

const bookingRootTypeDefs = `
  scalar DateTime

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
    startTime: DateTime!
    endTime: DateTime!
  }

  type Mutation {
    addBooking(input: BookingInput): Booking
  }
`;

const bookingAddressTypeDefs = `
  ${addressTypeDef}
  ${customerAddressTypeDef}
  ${bookingRootTypeDefs}
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

  DateTime,
};

export const propertySchema: GraphQLSchema = makeExecutableSchema({
  typeDefs: propertyAddressTypeDefs,
  resolvers: propertyResolvers,
});

export const bookingSchema: GraphQLSchema = makeExecutableSchema({
  typeDefs: bookingAddressTypeDefs,
  resolvers: bookingResolvers,
});

// Pretend this schema is remote
function makeSchemaRemote(schema: GraphQLSchema) {
  const fetcher: Fetcher = ({ query, operationName, variables, context }) => {
    return graphql(schema, query, null, context, variables, operationName);
  };

  return makeRemoteExecutableSchema(fetcher);
}

export const remotePropertySchema = makeSchemaRemote(propertySchema);
export const remoteBookingSchema = makeSchemaRemote(bookingSchema);
