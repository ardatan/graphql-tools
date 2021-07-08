import { print, parse } from 'graphql';
import { FilterToSchema, DelegationContext } from '@graphql-tools/delegate';
import { bookingSchema } from './fixtures/schemas';

// @todo: move this to the delegate package

describe('FilterToSchema', () => {
  let filter: FilterToSchema;
  beforeAll(() => {
    filter = new FilterToSchema();
  });

  test('should remove empty selection sets on objects', () => {
    const query = parse(`
    query customerQuery($id: ID!) {
      customerById(id: $id) {
        id
        name
        address {
          planet
        }
      }
    }
    `);
    const filteredQuery = filter.transformRequest({
      document: query,
      variables: {
        id: 'c1',
      },
      operationType: 'query' as const
    }, {
      targetSchema: bookingSchema
    } as DelegationContext, {});

    const expected = parse(`
    query customerQuery($id: ID!) {
      customerById(id: $id) {
        id
        name
      }
    }
    `);
    expect(print(filteredQuery.document)).toBe(print(expected));
  });

  test('should also remove variables when removing empty selection sets', () => {
    const query = parse(`
    query customerQuery($id: ID!, $limit: Int) {
      customerById(id: $id) {
        id
        name
        bookings(limit: $limit) {
          paid
        }
      }
    }
    `);
    const filteredQuery = filter.transformRequest({
      document: query,
      variables: {
        id: 'c1',
        limit: 10,
      },
      operationType: 'query' as const,
    }, {
      targetSchema: bookingSchema
    } as DelegationContext, {});

    const expected = parse(`
    query customerQuery($id: ID!) {
      customerById(id: $id) {
        id
        name
      }
    }
    `);
    expect(print(filteredQuery.document)).toBe(print(expected));
  });

  test('should remove empty selection sets on wrapped objects (non-nullable/lists)', () => {
    const query = parse(`
      query bookingQuery($id: ID!) {
        bookingById(id: $id) {
          id
          propertyId
          customer {
            favoriteFood
          }
        }
      }
      `);
    const filteredQuery = filter.transformRequest({
      document: query,
      variables: {
        id: 'b1',
      },
      operationType: 'query' as const,
    }, {
      targetSchema: bookingSchema
    } as DelegationContext, {});

    const expected = parse(`
      query bookingQuery($id: ID!) {
        bookingById(id: $id) {
          id
          propertyId
        }
      }
      `);
    expect(print(filteredQuery.document)).toBe(print(expected));
  });
});
