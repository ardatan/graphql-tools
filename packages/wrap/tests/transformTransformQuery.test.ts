import { Kind, OperationTypeNode, parse } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { TransformQuery } from '../src';
import { delegateToSchema } from '@graphql-tools/delegate';
import { execute } from '@graphql-tools/executor';

describe('TransformQuery', () => {
  test('calls queryTransformer even when there is no subtree', async () => {
    let queryTransformerCalled = 0;
    const data = {
      u1: {
        id: 'user1',
        addressStreetAddress: 'Windy Shore 21 A 7',
        addressZip: '12345',
      },
    };
    const subschema = makeExecutableSchema({
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
    const schema = makeExecutableSchema({
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
                  queryTransformer: () => {
                    queryTransformerCalled++;
                    return {
                      kind: Kind.SELECTION_SET,
                      selections: [
                        {
                          kind: Kind.FIELD,
                          name: { kind: Kind.NAME, value: 'addressZip' },
                        },
                      ],
                    };
                  },
                  resultTransformer: result => result.addressZip,
                }),
              ],
            });
          },
        },
      },
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          zipByUser(id: "u1")
        }
      `),
    });

    expect(queryTransformerCalled).toEqual(1);
    expect(result).toEqual({ data: { zipByUser: '12345' } });
  });
});
