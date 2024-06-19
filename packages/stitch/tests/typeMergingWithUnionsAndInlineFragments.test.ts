import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { GraphQLSchema } from 'graphql/type/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { graphql } from 'graphql/index';

describe('Unions and Inline Fragments', () => {
  const { allStitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

  let studentSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      ${allStitchingDirectivesTypeDefs}
      type Query {
        student(id: String!): Student
      }

      type Student {
        id: String!
        name: String!
        major: Major!
      }

      union Major = StubMajor

      type StubMajor {
        id: String!
      }
    `,
  });

  let majorsSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      ${allStitchingDirectivesTypeDefs}
      type Query {
        major(id: String!): Major @merge(keyField: "id")
      }

      union Major = MajorError | MajorSuccess # Allow for different return values
      type MajorError {
        id: String!
        code: String!
      }

      type MajorSuccess {
        id: String!
        name: String!
      }
    `,
  });

  let stitchedSchema: GraphQLSchema;

  let studentResolvers;

  let majorResolvers: any;

  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    studentResolvers = {
      Major: {
        __resolveType: (_obj: any) => {
          return 'StubMajor';
        },
      },
      Query: {
        student: async (_source: any, args: { id: string }) => {
          return {
            id: args.id,
            name: 'Bob',
            major: {
              id: 'COMM.1231',
            },
          };
        },
      },
    };

    majorResolvers = {
      Major: {
        __resolveType: (obj: any) => {
          if (obj.name) return 'MajorSuccess';
          if (obj.code) return 'MajorError';
          return null;
        },
      },
      Query: {
        major: async (
          _source: any,
          args: { id: string }
        ): Promise<{ id: string; name: string } | { id: string; code: string }> => {
          return {
            id: args.id,
            name: 'Communications',
          };
        },
      },
    };

    studentSchema = addMocksToSchema({
      schema: studentSchema,
      resolvers: studentResolvers,
    });
    majorsSchema = addMocksToSchema({
      schema: majorsSchema,
      resolvers: majorResolvers,
    });

    stitchedSchema = stitchSchemas({
      subschemas: [{ schema: studentSchema }, { schema: majorsSchema }],
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
      resolverValidationOptions: { requireResolversForResolveType: 'ignore' },
    });
  });
  it('handles success', async () => {
    const query = /* GraphQL */ `
      query {
        student(id: "12314241") {
          id
          name
          major {
            ... on MajorSuccess {
              id
              name
            }
            ... on MajorError {
              id
              code
            }
          }
        }
      }
    `;

    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });
    expect(result.errors).toBe(undefined);
    expect(result.data).toEqual({
      student: {
        id: '12314241',
        name: 'Bob',
        major: {
          id: 'COMM.1231',
          name: 'Communications',
        },
      },
    });
  });
  it('error', async () => {
    const query = /* GraphQL */ `
      query {
        student(id: "12314241") {
          id
          name
          major {
            ... on MajorSuccess {
              id
              name
            }
            ... on MajorError {
              id
              code
            }
          }
        }
      }
    `;
    const majorsSpy = jest.spyOn(majorResolvers.Query, 'major');
    majorsSpy.mockResolvedValue({ id: 'COMM.1231', code: 'NOT_FOUND' });
    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });
    expect(result.errors).toBe(undefined);
    expect(result.data).toEqual({
      student: {
        id: '12314241',
        name: 'Bob',
        major: {
          id: 'COMM.1231',
          code: 'NOT_FOUND',
        },
      },
    });
  });
});
