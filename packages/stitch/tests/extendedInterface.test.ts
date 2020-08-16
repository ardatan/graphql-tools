import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas';

describe('merging using type merging', () => {
  test('works', async () => {
    let postsSchema = makeExecutableSchema({
      typeDefs: `
        interface Slot {
          id: ID!
        }

        type Post implements Slot {
          id: ID!
          title: String!
        }

        type Query {
          slot: Slot
        }
      `,
      resolvers: {
        Query: {
          slot() {
            return { id: '23', title: 'The Title' };
          }
        }
      }
    });

    chirpSchema = addMocksToSchema({ schema: postsSchema });

    const stitchedSchema = stitchSchemas({
      subschemas: [
        { schema: postsSchema },
      ],
      typeDefs: `
        extend interface Slot {
          title: String!
        }
      `,
    });

    const result = await graphql(stitchedSchema, `
      query {
        slot {
          id
          title
        }
      }
    `);

    expect(result.data.slot).toBe({ id: '23', title: 'The Title' });
  });
});
