import { graphql, GraphQLSchema, OperationTypeNode } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { delegateToSchema } from '@graphql-tools/delegate';
import { addMocksToSchema } from '@graphql-tools/mock';
import { stitchSchemas } from '@graphql-tools/stitch';
import { assertSome } from '@graphql-tools/utils';

describe('basic stitching example', () => {
  test('works', async () => {
    let chirpSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Chirp {
          id: ID!
          text: String
          authorId: ID!
        }

        type Query {
          chirpById(id: ID!): Chirp
          chirpsByAuthorId(authorId: ID!): [Chirp]
        }
      `,
    });

    chirpSchema = addMocksToSchema({ schema: chirpSchema });

    // Mocked author schema
    let authorSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          email: String
        }

        type Query {
          userById(id: ID!): User
        }
      `,
    });

    authorSchema = addMocksToSchema({ schema: authorSchema });

    const linkTypeDefs = /* GraphQL */ `
      extend type User {
        chirps: [Chirp]
      }

      extend type Chirp {
        author: User
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [{ schema: chirpSchema }, { schema: authorSchema }],
      typeDefs: linkTypeDefs,
      resolvers: {
        User: {
          chirps: {
            selectionSet: `{ id }`,
            resolve: (user, _args, context, info) =>
              delegateToSchema({
                schema: chirpSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'chirpsByAuthorId',
                args: {
                  authorId: user.id,
                },
                context,
                info,
              }),
          },
        },
        Chirp: {
          author: {
            selectionSet: `{ authorId }`,
            resolve: (chirp, _args, context, info) =>
              delegateToSchema({
                schema: authorSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'userById',
                args: {
                  id: chirp.authorId,
                },
                context,
                info,
              }),
          },
        },
      },
    });

    const query = /* GraphQL */ `
      query {
        userById(id: 5) {
          chirps {
            id
            textAlias: text
            author {
              email
            }
          }
        }
      }
    `;

    const result = await graphql({ schema: stitchedSchema, source: query });

    expect(result.errors).toBeUndefined();
    assertSome(result.data);
    const userByIdData: any = result.data['userById'];
    expect(userByIdData.chirps[1].id).not.toBe(null);
    expect(userByIdData.chirps[1].text).not.toBe(null);
    expect(userByIdData.chirps[1].author.email).not.toBe(null);
  });
});

describe('stitching to interfaces', () => {
  let stitchedSchema: GraphQLSchema;
  beforeAll(() => {
    let chirpSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Node {
          id: ID!
        }

        type Chirp implements Node {
          id: ID!
          text: String
          authorId: ID!
        }

        type Query {
          node(id: ID!): Node
          chirpsByAuthorId(authorId: ID!): [Chirp]
        }
      `,
    });

    chirpSchema = addMocksToSchema({ schema: chirpSchema });

    let authorSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Node {
          id: ID!
        }

        type User implements Node {
          id: ID!
          email: String
        }

        type Query {
          node(id: ID!): Node
        }
      `,
    });

    authorSchema = addMocksToSchema({ schema: authorSchema });

    const linkTypeDefs = /* GraphQL */ `
      extend type User {
        chirps: [Chirp]
      }

      extend type Chirp {
        author: User
      }
    `;

    stitchedSchema = stitchSchemas({
      subschemas: [{ schema: chirpSchema }, { schema: authorSchema }],
      typeDefs: linkTypeDefs,
      resolvers: {
        User: {
          chirps: {
            selectionSet: `{ id }`,
            resolve: (user, _args, context, info) =>
              delegateToSchema({
                schema: chirpSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'chirpsByAuthorId',
                args: {
                  authorId: user.id,
                },
                context,
                info,
              }),
          },
        },
        Chirp: {
          author: {
            selectionSet: `{ authorId }`,
            resolve: (chirp, _args, context, info) =>
              delegateToSchema({
                schema: authorSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'node',
                args: {
                  id: chirp.authorId,
                },
                context,
                info,
              }),
          },
        },
      },
    });
  });

  test('it works with fragments', async () => {
    const queryWithFragments = `
      query {
        node(id: "fakeUserId") {
          ... on User {
            chirps {
              id
              textAlias: text
              author {
                ... on User {
                  email
                }
              }
            }
          }
        }
      }
    `;

    const resultWithFragments = await graphql({ schema: stitchedSchema, source: queryWithFragments });

    expect(resultWithFragments.errors).toBeUndefined();
    assertSome(resultWithFragments.data);
    const nodeData: any = resultWithFragments.data['node'];
    expect(nodeData.chirps[1].id).not.toBe(null);
    expect(nodeData.chirps[1].text).not.toBe(null);
    expect(nodeData.chirps[1].author.email).not.toBe(null);
  });

  test('it works without fragments', async () => {
    const queryWithoutFragments = `
      query {
        node(id: "fakeUserId") {
          ... on User {
            chirps {
              id
              author {
                email
              }
            }
          }
        }
      }
    `;

    const resultWithoutFragments = await graphql({ schema: stitchedSchema, source: queryWithoutFragments });

    expect(resultWithoutFragments.errors).toBeUndefined();
    assertSome(resultWithoutFragments.data);
    const nodeData: any = resultWithoutFragments.data['node'];
    expect(nodeData.chirps[1].id).not.toBe(null);
    expect(nodeData.chirps[1].text).not.toBe(null);
    expect(nodeData.chirps[1].author.email).not.toBe(null);
  });
});
