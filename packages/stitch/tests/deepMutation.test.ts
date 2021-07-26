import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

describe('deep mutation', () => {
  test('fails', async () => {
    const aSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          hello: String!
        }

        type FooMutations {
          a: String!
        }

        type Mutation {
          foo: FooMutations!
        }
      `,
      resolvers: {
        Query: {
          hello() {
            return 'Hello World';
          },
        },
        Mutation: {
          foo() {
            return {};
          },
        },
        FooMutations: {
          a() {
            return 'a';
          },
        },
      },
    });

    const bSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          hello: String!
        }

        type FooMutations {
          b: String!
        }

        type Mutation {
          foo: FooMutations!
        }
      `,
      resolvers: {
        Query: {
          hello() {
            return 'Hello World';
          },
        },
        Mutation: {
          foo() {
            return {};
          },
        },
        FooMutations: {
          b() {
            return 'b';
          },
        },
      },
    });

    const stitchedSchema = stitchSchemas({
      subschemas: [{ schema: aSchema }, { schema: bSchema }],
    });

    const mutationFooB = `
      mutation {
        foo {
          b
        }
      }
    `;

    const resultB = await graphql(stitchedSchema, mutationFooB);

    expect(resultB).toEqual({
      data: {
        foo: {
          b: 'b',
        },
      },
    });

    const mutationFooA = `
    mutation {
      foo {
        a
      }
    }
  `;

    const resultA = await graphql(stitchedSchema, mutationFooA);

    // This fails with: "GraphQLError: Cannot return null for non-nullable field Mutation.foo."
    expect(resultA).toEqual({
      data: {
        foo: {
          a: 'a',
        },
      },
    });
  });
});
