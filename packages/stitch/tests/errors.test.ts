import { graphql, GraphQLError, buildSchema } from 'graphql';

import { Executor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { ExecutionResult } from '@graphql-tools/utils';

describe('passes along errors for missing fields on list', () => {
  test('if non-null', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner!]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, {}],
          }),
        },
      },
    });

    const stitchedSchema = stitchSchemas({
      schemas: [schema],
    });

    const query = '{ getOuter { innerList { mandatoryField } } }';
    const originalResult = await graphql(schema, query);
    const stitchedResult = await graphql(stitchedSchema, query);
    expect(stitchedResult).toEqual(originalResult);
    expect(stitchedResult.errors[0].path).toEqual(originalResult.errors[0].path);
  });

  test('even if nullable', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, {}],
          }),
        },
      },
    });

    const stitchedSchema = stitchSchemas({
      schemas: [schema],
    });

    const query = '{ getOuter { innerList { mandatoryField } } }';
    const originalResult = await graphql(schema, query);
    const stitchedResult = await graphql(stitchedSchema, query);
    expect(stitchedResult).toEqual(originalResult);
    expect(stitchedResult.errors[0].path).toEqual(originalResult.errors[0].path);
  });
});

describe('passes along errors when list field errors', () => {
  test('if non-null', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner!]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, new Error('test')],
          }),
        },
      },
    });

    const stitchedSchema = stitchSchemas({
      schemas: [schema],
    });

    const query = '{ getOuter { innerList { mandatoryField } } }';
    const originalResult = await graphql(schema, query);
    const stitchedResult = await graphql(stitchedSchema, query);
    expect(stitchedResult).toEqual(originalResult);
    expect(stitchedResult.errors[0].path).toEqual(originalResult.errors[0].path);
  });

  test('even if nullable', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, new Error('test')],
          }),
        },
      },
    });

    const stitchedSchema = stitchSchemas({
      schemas: [schema],
    });

    const query = '{ getOuter { innerList { mandatoryField } } }';
    const originalResult = await graphql(schema, query);
    const stitchedResult = await graphql(stitchedSchema, query);
    expect(stitchedResult).toEqual(originalResult);
    expect(stitchedResult.errors[0].path).toEqual(originalResult.errors[0].path);
  });

  describe('passes along correct error when there are two non-null fields', () => {
    test('should work', async () => {
      const schema = makeExecutableSchema({
        typeDefs: `
          type Query {
            getBoth: Both
          }
          type Both {
            mandatoryField1: String!
            mandatoryField2: String!
          }
        `,
        resolvers: {
          Query: {
            getBoth: () => ({ mandatoryField1: 'test' }),
          },
        },
      });

      const stitchedSchema = stitchSchemas({
        subschemas: [schema],
      });

      const query = '{ getBoth { mandatoryField1 mandatoryField2 } }';
      const originalResult = await graphql(schema, query);
      const stitchedResult = await graphql(stitchedSchema, query);
      expect(stitchedResult).toEqual(originalResult);
      expect(stitchedResult.errors[0].path).toEqual(originalResult.errors[0].path);
    });
  });
});

describe('passes along errors for remote schemas', () => {
  it('it works', async () => {
    const typeDefs = `
      type Test {
        field: String!
      }

      type Query {
        test: Test!
      }
    `;

    const schema = buildSchema(typeDefs)

    const executor: Executor = () => ({
      data: {
        test: null
      },
      errors: [
        {
          message: 'INVALID_CREDENTIALS',
          path: ['test'],
        } as unknown as GraphQLError
      ],
    }) as ExecutionResult<any>;

    const stitchedSchema = stitchSchemas({
      schemas: [{
        schema,
        executor,
      }]
    });

    const expectedResult: ExecutionResult<any> = {
      data: null,
      errors: [
        new GraphQLError(
          'INVALID_CREDENTIALS',
          undefined,
          undefined,
          undefined,
          ['test'],
        )
      ],
    };

    const query = `{
      test {
        field
      }
    }`

    const result = await graphql(stitchedSchema, query);
    expect(result).toEqual(expectedResult);
  });
});
