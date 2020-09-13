import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { ExecutionResult } from '@graphql-tools/utils';
import { graphql, GraphQLError, GraphQLSchema } from 'graphql';

describe('merge failures', () => {
  const firstSchema = makeExecutableSchema({
    typeDefs: `
      type Thing {
        id: ID!
        name: String!
      }
      type Query {
        thing(id: ID!): Thing
      }
    `,
    resolvers: {
      Query: {
        thing: (_root, { id }) => ({ id, name: 'The Thing' }),
      }
    }
  });

  const getGatewaySchema = (secondSchema: GraphQLSchema): GraphQLSchema => stitchSchemas({
    subschemas: [
      {
        schema: firstSchema,
        merge: {
          Thing: {
            selectionSet: '{ id }',
            fieldName: 'thing',
            args: ({ id }) => ({ id }),
          }
        }
      },
      {
        schema: secondSchema,
        merge: {
          Thing: {
            selectionSet: '{ id }',
            fieldName: '_thing',
            args: ({ id }) => ({ id }),
          }
        }
      },
    ],
    mergeTypes: true
  });

  it('proxies merged errors', async () => {
    const secondSchema = makeExecutableSchema({
      typeDefs: `
        type Thing {
          id: ID!
          description: String!
        }
        type Query {
          _thing(id: ID!): Thing
        }
      `,
      resolvers: {
        Query: {
          _thing: () => new Error('unable to produce the thing'),
        }
      }
    });

    const gatewaySchema = getGatewaySchema(secondSchema);

    const result = await graphql(gatewaySchema, `
      query {
        thing(id: 23) {
          id
          name
          description
        }
      }
    `);

    const expectedResult: ExecutionResult = {
      data: { thing: null },
      errors: [new GraphQLError('unable to produce the thing')],
    }

    expect(result).toEqual(expectedResult);
  });

  it('proxies inappropriate null', async () => {
    const secondSchema = makeExecutableSchema({
      typeDefs: `
        type Thing {
          id: ID!
          description: String!
        }
        type Query {
          _thing(id: ID!): Thing
        }
      `,
      resolvers: {
        Query: {
          _thing: () => null,
        }
      }
    });

    const gatewaySchema = getGatewaySchema(secondSchema);

    const result = await graphql(gatewaySchema, `
      query {
        thing(id: 23) {
          id
          name
          description
        }
      }
    `);

    const expectedResult: ExecutionResult = {
      data: { thing: null },
      errors: [new GraphQLError('Cannot return null for non-nullable field Thing.description.')],
    }

    expect(result).toEqual(expectedResult);
  });

  it('proxies errors on object', async () => {
    const secondSchema = makeExecutableSchema({
      typeDefs: `
        type Thing {
          id: ID!
          description: String!
        }
        type Query {
          _thing(id: ID!): Thing
        }
      `,
      resolvers: {
        Query: {
          _thing: () => ({}),
        }
      }
    });

    const gatewaySchema = getGatewaySchema(secondSchema);

    const result = await graphql(gatewaySchema, `
      query {
        thing(id: 23) {
          id
          name
          description
        }
      }
    `);

    const expectedResult: ExecutionResult = {
      data: { thing: null },
      errors: [new GraphQLError('Cannot return null for non-nullable field Thing.description.')],
    }

    expect(result).toEqual(expectedResult);
  });
});
