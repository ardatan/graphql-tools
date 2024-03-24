import { graphql, OperationTypeNode, printSchema } from 'graphql/index';
import { delegateToSchema } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

describe('Blah', () => {
  const aResolvers = {
    Query: {
      thingA: async (_source: any, args: { id: string }) => {
        return args.id;
      },
    },
  };

  const bResolvers = {
    Query: {
      namespaceInB: () => true,
    },
  };

  const aggSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        thingA(id: ID!): String
      }
    `,
    resolvers: aResolvers,
  });

  const bbfSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        namespaceInB: NamespaceInB
      }

      type NamespaceInB {
        dummy: ID!
      }
    `,
    resolvers: bResolvers,
  });

  const stitchedSchema = stitchSchemas({
    subschemas: [{ schema: aggSchema }, { schema: bbfSchema }],
    typeDefs: /* GraphQL */ `
      extend type NamespaceInB {
        thingA(id: ID!): String
      }
    `,
    resolvers: {
      NamespaceInB: {
        thingA: {
          resolve: async (_parent, args, context, info) => {
            const result = await delegateToSchema({
              schema: aggSchema,
              operation: OperationTypeNode.QUERY,
              fieldName: 'thingA',
              args,
              context,
              info,
            });
            return result;
          },
        },
      },
    },
  });

  it('creates expected schema', () => {
    expect(printSchema(stitchedSchema)).toMatchSnapshot();
  });

  it('executes stitched query with dummy field', async () => {
    const query = /* GraphQL */ `
      query {
        namespaceInB {
          __typename
          thingA(id: "abc")
        }
      }
    `;

    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });
    expect(result.errors).toBe(undefined);
    expect(result.data).toEqual({
      namespaceInB: {
        __typename: 'NamespaceInB',
        thingA: 'abc',
      },
    });
  });

  it('executes stitched query without dummy field', async () => {
    const query = /* GraphQL */ `
      query {
        namespaceInB {
          thingA(id: "abc")
        }
      }
    `;

    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });
    expect(result.errors).toBe(undefined);
    expect(result.data).toEqual({
      namespaceInB: {
        thingA: 'abc',
      },
    });
  });
});
