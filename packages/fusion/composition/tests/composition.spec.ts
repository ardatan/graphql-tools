import { buildSchema } from 'graphql';
import { composeSubgraphs, createPrefixTypeTransform } from '@graphql-tools/fusion-composition';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Composition', () => {
  const aSchema = buildSchema(/* GraphQL */ `
    type Query {
      myFoo: Foo!
    }

    type Foo {
      id: ID!
    }
  `);

  const bSchema = buildSchema(/* GraphQL */ `
    type Query {
      foo(id: ID!): Foo!
    }

    type Foo {
      id: ID!
      bar: String!
    }
  `);
  it('composes basic schemas', () => {
    const composedSchema = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
      },
      {
        name: 'B',
        schema: bSchema,
      },
    ]);

    expect(printSchemaWithDirectives(composedSchema)).toMatchSnapshot();
  });
  it('composes with transforms', () => {
    const prefixTransform = createPrefixTypeTransform();
    const composedSchema = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
        transforms: [prefixTransform],
      },
      {
        name: 'B',
        schema: bSchema,
        transforms: [prefixTransform],
      },
    ]);

    expect(printSchemaWithDirectives(composedSchema)).toMatchSnapshot();
  });
});
