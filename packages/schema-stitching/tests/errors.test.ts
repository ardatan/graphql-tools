import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema-generator';

import { stitchSchemas } from '../src/stitchSchemas';

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
  });
});
