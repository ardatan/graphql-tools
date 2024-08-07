import { parse, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { prepareGatewayDocument } from '../src/prepareGatewayDocument';
import '../../testing/to-be-similar-gql-doc';
import { normalizedExecutor } from '@graphql-tools/executor';
import { Executor } from '@graphql-tools/utils';
import { createDefaultExecutor } from '../src/delegateToSchema';

describe('prepareGatewayDocument', () => {
  const posts = [
    { id: '1', title: 'The Post1', user: { id: '1' } },
    { id: '2', title: 'The Post2', user: { id: '2' } },
  ];
  const users = [
    { id: '1', name: 'The User1', posts: [posts[0]] },
    { id: '2', name: 'The User2', posts: [posts[1]] },
  ];
  const userSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type User {
        id: ID!
        name: String!
      }
      type Query {
        userById(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        userById: (_root, { id }) => {
          const foundUser = users.find(user => user.id === id);
          if (!foundUser) {
            return null;
          }
          return {
            id: foundUser.id,
            name: foundUser.name,
          };
        },
      },
    },
  });
  const postSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Post {
        id: ID!
        title: String!
        user: User
      }
      type User {
        id: ID!
        posts: [Post]
      }
      type Query {
        postById(id: ID!): Post
        userByIdWithPosts(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        postById: (_root, { id }) => posts.find(post => post.id === id),
        userByIdWithPosts: (_root, { id }) => {
          const foundUser = users.find(user => user.id === id);
          if (!foundUser) {
            return null;
          }
          return {
            id: foundUser.id,
            posts: foundUser.posts,
          };
        },
      },
    },
  });
  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: userSchema,
        merge: {
          User: {
            selectionSet: '{ id }',
            fieldName: 'userById',
            args: ({ id }: (typeof users)[0]) => ({ id }),
          },
        },
      },
      {
        schema: userSchema,
        merge: {
          User: {
            selectionSet: '{ id }',
            fieldName: 'userByIdWithPosts',
            args: ({ id }: (typeof users)[0]) => ({ id }),
          },
        },
      },
    ],
  });
  it('adds required selection sets if it is a merged field', () => {
    const posts = [
      { id: '1', title: 'The Post1', user: { id: '1' } },
      { id: '2', title: 'The Post2', user: { id: '2' } },
    ];
    const users = [
      { id: '1', name: 'The User1', posts: [posts[0]] },
      { id: '2', name: 'The User2', posts: [posts[1]] },
    ];
    const userSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          name: String!
        }
        type Query {
          userById(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          userById: (_root, { id }) => {
            const foundUser = users.find(user => user.id === id);
            if (!foundUser) {
              return null;
            }
            return {
              id: foundUser.id,
              name: foundUser.name,
            };
          },
        },
      },
    });
    const postSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Post {
          id: ID!
          title: String!
          user: User
        }
        type User {
          id: ID!
          posts: [Post]
        }
        type Query {
          postById(id: ID!): Post
          userByIdWithPosts(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          postById: (_root, { id }) => posts.find(post => post.id === id),
          userByIdWithPosts: (_root, { id }) => {
            const foundUser = users.find(user => user.id === id);
            if (!foundUser) {
              return null;
            }
            return {
              id: foundUser.id,
              posts: foundUser.posts,
            };
          },
        },
      },
    });
    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: userSchema,
          merge: {
            User: {
              selectionSet: '{ id }',
              fieldName: 'userById',
              args: ({ id }: (typeof users)[0]) => ({ id }),
            },
          },
        },
        {
          schema: userSchema,
          merge: {
            User: {
              selectionSet: '{ id }',
              fieldName: 'userByIdWithPosts',
              args: ({ id }: (typeof users)[0]) => ({ id }),
            },
          },
        },
      ],
    });
    const originalDocument = parse(/* GraphQL */ `
      query {
        userByIdWithPosts(id: "1") {
          name
          posts {
            id
            title
          }
        }
      }
    `);
    const preparedDocument = prepareGatewayDocument(
      originalDocument,
      postSchema,
      postSchema.getQueryType()!,
      gatewaySchema,
    );
    expect(print(preparedDocument)).toBeSimilarGqlDoc(/* GraphQL */ `
      query {
        __typename
        userByIdWithPosts(id: "1") {
          __typename
          id
          name
          posts {
            id
            title
          }
        }
      }
    `);
  });
  it('does not add required selection sets if it is not a merged field', () => {
    const originalDocument = parse(/* GraphQL */ `
      query {
        userByIdWithPosts(id: "1") {
          posts {
            id
            title
          }
        }
      }
    `);
    const preparedDocument = prepareGatewayDocument(
      originalDocument,
      postSchema,
      postSchema.getQueryType()!,
      gatewaySchema,
    );
    expect(print(preparedDocument)).toBeSimilarGqlDoc(/* GraphQL */ `
      query {
        __typename
        userByIdWithPosts(id: "1") {
          posts {
            id
            title
          }
        }
      }
    `);
  });
  it('handles distributed abstract types', async () => {
    const ovens = [
      {
        __typename: 'Oven',
        id: 'oven1',
        warranty: 1,
      },
      {
        __typename: 'Oven',
        id: 'oven2',
        warranty: 2,
      },
    ];
    const toasters = [
      {
        __typename: 'Toaster',
        id: 'toaster1',
        warranty: 3,
      },
      {
        __typename: 'Toaster',
        id: 'toaster2',
        warranty: 4,
      },
    ];

    const products = [...ovens, ...toasters];

    const schemaA = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar KeyA

        type Query {
          products: [Product]
          node(id: ID!): Node
          nodes: [Node]
          toasters: [Toaster]
          entitiesA(keys: [KeyA]): [EntityA]
        }

        union EntityA = Oven | Toaster

        union Product = Oven | Toaster

        interface Node {
          id: ID!
        }

        type Oven {
          id: ID!
        }

        type Toaster implements Node {
          id: ID!
          warranty: Int
        }
      `,
      resolvers: {
        Query: {
          products() {
            return products.map(product => {
              if (product.__typename === 'Oven') {
                return {
                  __typename: 'Oven',
                  id: product.id,
                };
              } else {
                return {
                  __typename: 'Toaster',
                  id: product.id,
                  warranty: product.warranty,
                };
              }
            });
          },
          node(_: never, { id }: { id: string }) {
            const product = products.find(p => p.id === id);

            if (product?.__typename === 'Oven') {
              return {
                __typename: 'Oven',
                id: product.id,
              };
            } else if (product?.__typename === 'Toaster') {
              return {
                __typename: 'Toaster',
                id: product.id,
                warranty: product.warranty,
              };
            }

            return null;
          },
          toasters() {
            return products
              .filter(product => product.__typename === 'Toaster')
              .map(toaster => ({
                __typename: 'Toaster',
                id: toaster.id,
                warranty: toaster.warranty,
              }));
          },
          nodes() {
            return products
              .filter(product => product.__typename === 'Toaster')
              .map(toaster => ({
                __typename: 'Toaster',
                id: toaster.id,
                warranty: toaster.warranty,
              }));
          },
          entitiesA(_: never, { keys }: { keys: any[] }) {
            return keys.map(key => {
              if (key.__typename === 'Oven') {
                const oven = products.find(p => p.id === key.id);

                if (oven?.__typename === 'Oven') {
                  return {
                    __typename: 'Oven',
                    id: oven.id,
                  };
                }
              }
              if (key.__typename === 'Toaster') {
                const toaster = products.find(p => p.id === key.id);

                if (toaster?.__typename === 'Toaster') {
                  return {
                    __typename: 'Toaster',
                    id: toaster.id,
                    warranty: toaster.warranty,
                  };
                }
              }

              return null;
            });
          },
        },
        Oven: {
          warranty() {
            throw new Error('Never');
          },
        },
      },
      resolverValidationOptions: {
        requireResolversToMatchSchema: 'ignore',
      },
    });

    const schemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar KeyB
        type Query {
          entitiesB(keys: [KeyB]): [EntityB]
        }

        union EntityB = Oven

        interface Node {
          id: ID!
        }

        type Oven implements Node {
          id: ID!
          warranty: Int
        }
      `,
      resolvers: {
        Query: {
          entitiesB(_: never, { keys }: { keys: any[] }) {
            return keys.map(key => {
              if (key.__typename === 'Oven') {
                const oven = products.find(p => p.id === key.id);

                if (oven?.__typename === 'Oven') {
                  return {
                    __typename: 'Oven',
                    id: oven.id,
                    warranty: 1,
                  };
                }
              }

              return null;
            });
          },
        },
      },
    });

    const executorA = jest.fn(createDefaultExecutor(schemaA));
    const executorB = jest.fn(createDefaultExecutor(schemaB));

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: schemaA,
          executor: executorA as Executor,
          merge: {
            Oven: {
              selectionSet: '{ id }',
              fieldName: 'entitiesA',
              key: ({ id }: { id: string }) => ({ id, __typename: 'Oven' }),
              argsFromKeys: keys => ({ keys }),
            },
            Toaster: {
              selectionSet: '{ id }',
              fieldName: 'entitiesA',
              key: ({ id }: { id: string }) => ({ id, __typename: 'Toaster' }),
              argsFromKeys: keys => ({ keys }),
            },
          },
        },
        {
          schema: schemaB,
          executor: executorB as Executor,
          merge: {
            Oven: {
              selectionSet: '{ id }',
              fieldName: 'entitiesB',
              key: ({ id }: { id: string }) => ({ id, __typename: 'Oven' }),
              argsFromKeys: keys => ({ keys }),
            },
          },
        },
      ],
    });

    const result = await normalizedExecutor({
      document: parse(/* GraphQL */ `
        query {
          products {
            ... on Node {
              id
            }
          }
        }
      `),
      schema: gatewaySchema,
    });

    expect(result).toEqual({
      data: {
        products: [
          {
            id: 'oven1',
          },
          {
            id: 'oven2',
          },
          {
            id: 'toaster1',
          },
          {
            id: 'toaster2',
          },
        ],
      },
    });

    expect(executorA).toHaveBeenCalledTimes(1);
    expect(executorB).toHaveBeenCalledTimes(0);

    expect(print(executorA.mock.calls[0][0].document)).toBeSimilarGqlDoc(/* GraphQL */ `
      query {
        __typename
        products {
          __typename
          ... on Oven {
            id
          }
          ... on Node {
            id
          }
        }
      }
    `);
  });
});
