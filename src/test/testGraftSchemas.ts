/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import { graphql } from 'graphql';
import mergeSchemas from '../stitching/mergeSchemas';
import { propertySchema, bookingSchema } from './testingSchemas';

const mergedSchema = mergeSchemas({
  schemas: [
    {
      schema: propertySchema,
    },
    {
      prefix: 'Booking',
      schema: bookingSchema,
    },
  ],
  links: [
    {
      name: 'bookings',
      from: 'Property',
      to: 'Booking_bookingsByPropertyId',
      fragment: `fragment Property on Property { id }`,
      args: ['limit'],
      resolveArgs(parent) {
        return {
          propertyId: parent.id,
        };
      },
    },
    {
      name: 'property',
      from: 'Booking',
      fragment: `fragment Booking on Booking { propertyId }`,
      to: 'propertyById',
      resolveArgs(parent) {
        return {
          id: parent.propertyId,
        };
      },
    },
  ],
});

describe('basic (graft)', () => {
  it('queries', async () => {
    const propertyFragment = (queryName: string) => `
${queryName}(id: "p1") {
  id
  name
}
  `;
    const bookingFragment = (queryName: string) => `
${queryName}(id: "b1") {
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
      `query { ${propertyFragment('propertyById')} }`,
    );

    const bookingResult = await graphql(
      bookingSchema,
      `query { ${bookingFragment('bookingById')} }`,
    );

    const mergedResult = await graphql(
      mergedSchema,
      `query {
      ${propertyFragment('propertyById')}
      ${bookingFragment('Booking_bookingById')}
    }`,
    );

    expect(propertyResult.errors).to.be.undefined;
    expect(bookingResult.errors).to.be.undefined;
    expect(mergedResult.errors).to.be.undefined;
    expect(propertyResult).to.have.nested.property('data.propertyById');
    expect(bookingResult).to.have.nested.property('data.bookingById');
    expect(mergedResult).to.have.nested.property('data.propertyById');
    expect(mergedResult).to.have.nested.property('data.Booking_bookingById');

    expect(mergedResult.data.propertyById).to.deep.equal(
      propertyResult.data.propertyById,
    );
    expect(mergedResult.data.Booking_bookingById).to.deep.equal(
      bookingResult.data.bookingById,
    );
  });

  // Technically mutations are not idempotent, but they are in our test schemas
  it('mutations', async () => {
    const mutationFragment = (name: string) => `
      mutation Mutation($input: BookingInput!) {
        ${name}(input: $input) {
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
      mutationFragment('addBooking'),
      {},
      {},
      {
        input,
      },
    );
    const mergedResult = await graphql(
      mergedSchema,
      mutationFragment('Booking_addBooking'),
      {},
      {},
      {
        input,
      },
    );

    expect(bookingResult.errors).to.be.undefined;
    expect(mergedResult.errors).to.be.undefined;
    expect(bookingResult).to.have.nested.property('data.addBooking');
    expect(mergedResult).to.have.nested.property('data.Booking_addBooking');

    expect(mergedResult.data.Booking_addBooking).to.deep.equal(
      bookingResult.data.addBooking,
    );
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

  booking: Booking_bookingById(id: "b1") {
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

    expect(mergedResult.errors).to.be.undefined;
    expect(mergedResult).to.have.nested.property('data.firstProperty');
    expect(mergedResult).to.have.nested.property('data.secondProperty');
    expect(mergedResult).to.have.nested.property('data.booking');

    expect(mergedResult.data).to.deep.equal({
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

    expect(mergedResult.errors).to.be.undefined;
    expect(mergedResult).to.have.nested.property('data.propertyById');

    expect(mergedResult.data).to.deep.equal({
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

    expect(mergedResult.errors).to.be.undefined;
    expect(mergedResult).to.have.nested.property('data.propertyById');

    expect(mergedResult.data).to.deep.equal({
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
    });
  });
});

describe('fragments (graft)', () => {
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
query {
  propertyById(id: "p1") {
    ...PropertyFragment
  }
}

${propertyFragment}
`,
    );

    const bookingResult = await graphql(
      bookingSchema,
      `
query {
  bookingById(id: "b1") {
    ...BookingFragment
  }
}

${bookingFragment}
      `,
    );

    const mergedResult = await graphql(
      mergedSchema,
      `
query {
  propertyById(id: "p1") {
    ...PropertyFragment
  }

  Booking_bookingById(id: "b1") {
    ...BookingFragment
  }
}

${propertyFragment}
${bookingFragment}
`,
    );

    expect(propertyResult.errors).to.be.undefined;
    expect(bookingResult.errors).to.be.undefined;
    expect(mergedResult.errors).to.be.undefined;
    expect(propertyResult).to.have.nested.property('data.propertyById');
    expect(bookingResult).to.have.nested.property('data.bookingById');
    expect(mergedResult).to.have.nested.property('data.propertyById');
    expect(mergedResult).to.have.nested.property('data.Booking_bookingById');

    expect(mergedResult.data.propertyById).to.deep.equal(
      propertyResult.data.propertyById,
    );
    expect(mergedResult.data.Booking_bookingById).to.deep.equal(
      bookingResult.data.bookingById,
    );
  });

  it('inline', async () => {
    const propertyFragment = (queryName: string) => `
${queryName}(id: "p1") {
  ... on Property {
    id
  }
  name
}
  `;
    const bookingFragment = (queryName: string) => `
${queryName}(id: "b1") {
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
      `query { ${propertyFragment('propertyById')} }`,
    );

    const bookingResult = await graphql(
      bookingSchema,
      `query { ${bookingFragment('bookingById')} }`,
    );

    const mergedResult = await graphql(
      mergedSchema,
      `query {
      ${propertyFragment('propertyById')}
      ${bookingFragment('Booking_bookingById')}
    }`,
    );

    expect(propertyResult.errors).to.be.undefined;
    expect(bookingResult.errors).to.be.undefined;
    expect(mergedResult.errors).to.be.undefined;
    expect(propertyResult).to.have.nested.property('data.propertyById');
    expect(bookingResult).to.have.nested.property('data.bookingById');
    expect(mergedResult).to.have.nested.property('data.propertyById');
    expect(mergedResult).to.have.nested.property('data.Booking_bookingById');

    expect(mergedResult.data.propertyById).to.deep.equal(
      propertyResult.data.propertyById,
    );
    expect(mergedResult.data.Booking_bookingById).to.deep.equal(
      bookingResult.data.bookingById,
    );
  });

  it('containing links', async () => {
    const mergedResult = await graphql(
      mergedSchema,
      `
query {
  propertyById(id: "p2") {
    id
    ...on Property {
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

    expect(mergedResult.errors).to.be.undefined;
    expect(mergedResult).to.have.nested.property('data.propertyById');

    expect(mergedResult.data).to.deep.equal({
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
    });
  });
});

describe('variables (graft)', () => {
  it('basic', async () => {
    const propertyFragment = (queryName: string) => `
${queryName}(id: $p1) {
  id
  name
}
  `;
    const bookingFragment = (queryName: string) => `
${queryName}(id: $b1) {
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
      `query($p1: ID!) { ${propertyFragment('propertyById')} }`,
      {},
      {},
      {
        p1: 'p1',
      },
    );

    const bookingResult = await graphql(
      bookingSchema,
      `query($b1: ID!) { ${bookingFragment('bookingById')} }`,
      {},
      {},
      {
        b1: 'b1',
      },
    );

    const mergedResult = await graphql(
      mergedSchema,
      `query($p1: ID!, $b1: ID!) {
        ${propertyFragment('propertyById')}
        ${bookingFragment('Booking_bookingById')}
      }`,
      {},
      {},
      {
        p1: 'p1',
        b1: 'b1',
      },
    );

    expect(propertyResult.errors).to.be.undefined;
    expect(bookingResult.errors).to.be.undefined;
    expect(mergedResult.errors).to.be.undefined;
    expect(propertyResult).to.have.nested.property('data.propertyById');
    expect(bookingResult).to.have.nested.property('data.bookingById');
    expect(mergedResult).to.have.nested.property('data.propertyById');
    expect(mergedResult).to.have.nested.property('data.Booking_bookingById');

    expect(mergedResult.data.propertyById).to.deep.equal(
      propertyResult.data.propertyById,
    );
    expect(mergedResult.data.Booking_bookingById).to.deep.equal(
      bookingResult.data.bookingById,
    );
  });

  it('in link selections', async () => {
    const mergedResult = await graphql(
      mergedSchema,
      `
query($limit: Int) {
  propertyById(id: "p1") {
    id
    name
    ...on Property {
      bookings(limit: $limit) {
        id
        customer {
          name
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

    expect(mergedResult.errors).to.be.undefined;
    expect(mergedResult).to.have.nested.property('data.propertyById');

    expect(mergedResult.data).to.deep.equal({
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
    });
  });
});
