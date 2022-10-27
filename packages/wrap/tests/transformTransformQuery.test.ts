import { GraphQLSchema, Kind, OperationTypeNode, parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { TransformQuery } from '@graphql-tools/wrap';
import { QueryTransformer } from '@graphql-tools/wrap/src/transforms/TransformQuery';
import { delegateToSchema } from '@graphql-tools/delegate';
import { execute } from '@graphql-tools/executor';

describe('TransformQuery', () => {
  let data: any;
  const queryTransformer: QueryTransformer = jest.fn(() => ({
    kind: Kind.SELECTION_SET,
    selections: [
      {
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: 'addressZip' },
      },
    ],
  }));
  let subschema: GraphQLSchema;
  let schema: GraphQLSchema;
  beforeAll(() => {
    data = {
      u1: {
        id: 'user1',
        addressStreetAddress: 'Windy Shore 21 A 7',
        addressZip: '12345',
      },
    };
    subschema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          addressStreetAddress: String
          addressZip: String
        }

        type Query {
          userById(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          userById(_parent, { id }) {
            return data[id];
          },
        },
      },
    });
    schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }

        type Query {
          zipByUser(id: ID!): String
        }
      `,
      resolvers: {
        Query: {
          zipByUser(_parent, { id }, context, info) {
            return delegateToSchema({
              schema: subschema,
              operation: 'query' as OperationTypeNode,
              fieldName: 'userById',
              args: { id },
              context,
              info,
              transforms: [
                new TransformQuery({
                  path: ['userById'],
                  queryTransformer,
                  resultTransformer: result => result.addressZip,
                }),
              ],
            });
          },
        },
      },
    });
  });

  test('calls queryTransformer even when there is no subtree', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          zipByUser(id: "u1")
        }
      `),
    });

    expect(queryTransformer).toHaveBeenCalledWith(undefined, expect.anything(), expect.anything(), expect.anything());
    expect(result).toEqual({ data: { zipByUser: '12345' } });
  });
});
