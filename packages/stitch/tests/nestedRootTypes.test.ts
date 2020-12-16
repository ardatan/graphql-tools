import { makeExecutableSchema } from "@graphql-tools/schema";
import { stitchSchemas } from "@graphql-tools/stitch";
import { graphql } from 'graphql';

describe('nested root types', () => {
  const schema1 = makeExecutableSchema({
    typeDefs: `
      type Query {
        schema1Boolean: Boolean
        schema1Query: Query
      }
    `,
    resolvers: {
      Query: {
        schema1Boolean: () => true,
        schema1Query: () => ({}),
      },
    },
  });

  const schema2 = makeExecutableSchema({
    typeDefs: `
      type Query {
        schema2Boolean: Boolean
        schema2Query: Query
      }
    `,
    resolvers: {
      Query: {
        schema2Boolean: () => true,
        schema2Query: () => ({}),
      },
    },
  });

  const stitchedSchema = stitchSchemas({
    subschemas: [schema1, schema2],
  });

  it('works to nest root field', async () => {
    const query = `
      query {
        schema1Query {
          schema1Boolean
          schema2Query {
            schema1Boolean
          }
        }
        schema2Query {
          schema2Boolean
          schema1Query {
            schema2Boolean
          }
        }
      }
    `;

    const expectedResult = {
      data: {
        schema1Query: {
          schema1Boolean: true,
          schema2Query: {
            schema1Boolean: true,
          },
        },
        schema2Query: {
          schema2Boolean: true,
          schema1Query: {
            schema2Boolean: true,
          },
        },
      },
    };

    const result = await graphql(stitchedSchema, query);
    expect(result).toEqual(expectedResult);
  });
});
