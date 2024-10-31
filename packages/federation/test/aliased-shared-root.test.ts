import { parse } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromLocalSchemas } from './getStitchedSchemaFromLocalSchemas';

describe('Aliased Shared Root Fields', () => {
  it('issue #6613', async () => {
    const query = /* GraphQL */ `
      query {
        testNestedField {
          subgraph1 {
            id
            email
            sub1
          }
          testUserAlias: subgraph2 {
            id
            email
            sub2
          }
        }
      }
    `;

    const expectedResult = {
      data: {
        testNestedField: {
          subgraph1: {
            id: 'user1',
            email: 'user1@example.com',
            sub1: true,
          },
          testUserAlias: {
            id: 'user2',
            email: 'user2@example.com',
            sub2: true,
          },
        },
      },
    };

    const subgraph1 = buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          testNestedField: TestNestedField
        }

        type TestNestedField {
          subgraph1: TestUser1!
        }

        type TestUser1 {
          id: String!
          email: String!
          sub1: Boolean!
        }
      `),
      resolvers: {
        Query: {
          testNestedField: () => ({
            subgraph1: () => ({
              id: 'user1',
              email: 'user1@example.com',
              sub1: true,
            }),
          }),
        },
      },
    });
    const subgraph2 = buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          testNestedField: TestNestedField
        }

        type TestNestedField {
          subgraph2: TestUser2!
        }

        type TestUser2 {
          id: String!
          email: String!
          sub2: Boolean!
        }
      `),
      resolvers: {
        Query: {
          testNestedField: () => ({
            subgraph2: () => ({
              id: 'user2',
              email: 'user2@example.com',
              sub2: true,
            }),
          }),
        },
      },
    });

    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      subgraph1,
      subgraph2,
    });

    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(query),
    });

    expect(result).toEqual(expectedResult);
  });
});
