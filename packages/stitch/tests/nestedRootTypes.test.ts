import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql';

describe('nested root types', () => {
  const schema1 = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        schema1Boolean: Boolean
        schema1Query: Query
      }
      type Mutation {
        schema1Boolean: Boolean
        schema1Mutation: Mutation
      }
    `,
    resolvers: {
      Query: {
        schema1Boolean: () => true,
        schema1Query: () => ({}),
      },
      Mutation: {
        schema1Boolean: () => true,
        schema1Mutation: () => ({}),
      },
    },
  });

  const schema2 = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        schema2Boolean: Boolean
        schema2Query: Query
      }
      type Mutation {
        schema2Boolean: Boolean
        schema2Mutation: Mutation
      }
    `,
    resolvers: {
      Query: {
        schema2Boolean: () => true,
        schema2Query: () => ({}),
      },
      Mutation: {
        schema2Boolean: () => true,
        schema2Mutation: () => ({}),
      },
    },
  });

  const stitchedSchema = stitchSchemas({
    subschemas: [schema1, schema2],
  });

  it('works to nest Query', async () => {
    const query = /* GraphQL */ `
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

    const result = await graphql({ schema: stitchedSchema, source: query });
    expect(result).toEqual(expectedResult);
  });

  it('works to nest Mutation', async () => {
    const mutation = `
      mutation {
        schema1Mutation {
          schema1Boolean
          schema2Mutation {
            schema1Boolean
          }
        }
        schema2Mutation {
          schema2Boolean
          schema1Mutation {
            schema2Boolean
          }
        }
      }
    `;

    const expectedResult = {
      data: {
        schema1Mutation: {
          schema1Boolean: true,
          schema2Mutation: {
            schema1Boolean: true,
          },
        },
        schema2Mutation: {
          schema2Boolean: true,
          schema1Mutation: {
            schema2Boolean: true,
          },
        },
      },
    };

    const result = await graphql({ schema: stitchedSchema, source: mutation });
    expect(result).toEqual(expectedResult);
  });
});
