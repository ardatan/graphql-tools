import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas';

describe('extended interfaces', () => {
  test('expands extended interface types for subservices', async () => {
    const itemsSchema = makeExecutableSchema({
      typeDefs: `
        interface Slot {
          id: ID!
        }
        type Item implements Slot {
          id: ID!
          name: String!
        }
        type Query {
          slot: Slot
        }
      `,
      resolvers: {
        Query: {
          slot(obj, args, context, info) {
            return { __typename: 'Item', id: '23', name: 'The Item' };
          }
        }
      }
    });

    const stitchedSchema = stitchSchemas({
      subschemas: [
        { schema: itemsSchema },
      ],
      typeDefs: `
        extend interface Slot {
          name: String!
        }
      `,
    });

    const { data } = await graphql(stitchedSchema, `
      query {
        slot {
          id
          name
        }
      }
    `);

    expect(data.slot).toEqual({ id: '23', name: 'The Item' });
  });
});
