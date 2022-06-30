/* eslint-disable @typescript-eslint/no-unused-vars */
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '../src/stitchSchemas.js';
import { graphql } from 'graphql';
import { assertSome } from '@graphql-tools/utils';

describe('Mutation of stitched schema merge', () => {
  test('operation should be mutation', async () => {
    const sub0Schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          placeholder: Placeholder
        }
        type Placeholder {
          id: ID!
        }
        type Mutation {
          zeroUser(id: ID): User
        }
        type User {
          id: ID!
          zeroValue: String
          user: User!
        }
      `,
      resolvers: {
        Mutation: {
          zeroUser: (o, { id }) => ({ id }),
        },
        User: {
          zeroValue: (p, a, c, i) => `0: User: ${i.operation.operation}`,
          user: ({ id }) => ({ id }),
        },
      },
    });

    const sub1Schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          placeholder: Placeholder
        }
        type Placeholder {
          id: ID!
        }
        type Mutation {
          oneUser(id: ID): User
        }
        type User {
          id: ID!
          oneValue: String
          user: User!
        }
      `,
      resolvers: {
        Mutation: {
          oneUser: (o, { id }) => ({ id }),
        },
        User: {
          oneValue: (p, a, c, i) => `1: User: ${i.operation.operation}`,
          user: ({ id }) => ({ id }),
        },
      },
    });
    const mergedSchema = stitchSchemas({
      subschemas: [
        {
          schema: sub1Schema,
          merge: {
            User: {
              fieldName: 'oneUser',
              selectionSet: '{ id }',
              args: o => ({ id: o.id }),
            },
          },
        },
        {
          schema: sub0Schema,
          merge: {
            User: {
              fieldName: 'zeroUser',
              selectionSet: '{ id }',
              args: o => ({ id: o.id }),
            },
          },
        },
      ],
      mergeTypes: true, // << default in v7
    });
    const { data } = await graphql({
      schema: mergedSchema,
      source: /* GraphQL */ `
        mutation {
          # or oneUser, which zeroValue becomes null
          zeroUser(id: 1) {
            __typename
            id
            zeroValue
            oneValue
            user {
              __typename
              id
              zeroValue
              oneValue
            }
          }
        }
      `,
    });
    assertSome(data);
    const userData: any = data['zeroUser'];
    expect(userData).toEqual({
      __typename: 'User',
      id: '1',
      oneValue: '1: User: mutation',
      zeroValue: '0: User: mutation',
      user: {
        __typename: 'User',
        id: '1',
        oneValue: '1: User: mutation',
        zeroValue: '0: User: mutation',
      },
    });
  });
});
