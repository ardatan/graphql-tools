import { inspect } from 'util';
import { GraphQLSchema, parse } from 'graphql';
import { IntrospectAndCompose, LocalGraphQLDataSource } from '@apollo/gateway';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { assertAsyncIterable } from '../../loaders/url/tests/test-utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Defer', () => {
  const users = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Alan Turing' },
  ];
  const posts = [
    { id: '1', title: 'Hello, World!', authorId: '1' },
    { id: '2', title: 'My Story', authorId: '2' },
  ];
  function resolveWithDelay<T>(value: () => T, delay: number): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value()), delay));
  }
  const usersSubgraph = buildSubgraphSchema({
    typeDefs: parse(/* GraphQL */ `
      type Query {
        user(id: ID!): User
        users: [User]
      }

      type User @key(fields: "id") {
        id: ID!
        name: String!
      }
    `),
    resolvers: {
      User: {
        __resolveReference: (user: { id: string }) =>
          resolveWithDelay(() => users.find(u => u.id === user.id), 500),
      },
      Query: {
        users: () => resolveWithDelay(() => users, 300),
        user: (_, { id }) => resolveWithDelay(() => users.find(user => user.id === id), 500),
      },
    },
  });
  const postsSubgraph = buildSubgraphSchema({
    typeDefs: parse(/* GraphQL */ `
      type Query {
        post(id: ID!): Post
        posts: [Post]
      }

      type Post @key(fields: "id") {
        id: ID!
        title: String!
        author: User!
      }

      extend type User @key(fields: "id") {
        id: ID! @external
        posts: [Post]
      }
    `),
    resolvers: {
      Post: {
        __resolveReference: (post: { id: string }) =>
          resolveWithDelay(() => posts.find(p => p.id === post.id), 300),
        author: (post: { authorId: string }) =>
          resolveWithDelay(() => users.find(user => user.id === post.authorId), 300),
      },
      User: {
        __resolveReference: (user: { id: string }) =>
          resolveWithDelay(() => users.find(u => u.id === user.id), 300),
        posts: (user: { id: string }) =>
          resolveWithDelay(() => posts.filter(post => post.authorId === user.id), 300),
      },
      Query: {
        posts: () => resolveWithDelay(() => posts, 300),
        post: (_, { id }) => resolveWithDelay(() => posts.find(post => post.id === id), 300),
      },
    },
  });
  let schema: GraphQLSchema;
  beforeAll(async () => {
    const { supergraphSdl } = await new IntrospectAndCompose({
      subgraphs: [
        { name: 'users', url: 'http://localhost:4001/graphql' },
        { name: 'posts', url: 'http://localhost:4002/graphql' },
      ],
    }).initialize({
      update() {},
      async healthCheck() {},
      getDataSource({ name }) {
        if (name === 'users') return new LocalGraphQLDataSource(usersSubgraph);
        if (name === 'posts') return new LocalGraphQLDataSource(postsSubgraph);
        throw new Error(`Unknown subgraph: ${name}`);
      },
    });
    schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const subgraphName = subschemaConfig.name.toLowerCase();
        if (subgraphName === 'users') {
          subschemaConfig.executor = createDefaultExecutor(usersSubgraph);
        } else if (subgraphName === 'posts') {
          subschemaConfig.executor = createDefaultExecutor(postsSubgraph);
        } else {
          throw new Error(`Unknown subgraph: ${subgraphName}`);
        }
      },
    });
  });
  it('defers the root fields', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          ... @defer {
            users {
              id
              name
              posts {
                id
                title
                author {
                  id
                  name
                }
              }
            }
          }
          ... @defer {
            posts {
              id
              title
              author {
                id
                name
                posts {
                  id
                  title
                }
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values = [];
    for await (const value of result) {
      if (value.incremental?.some(v => v.errors?.length)) {
        throw new Error(`Unexpected on incremental response: ${inspect(value, false, Infinity)}`);
      }
      if (value.errors) {
        throw new Error(`Unexpected error: ${value.errors}`);
      }
      values.push(value);
    }
    expect(values).toMatchInlineSnapshot(`
[
  {
    "data": {},
    "hasNext": true,
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "data": {
          "posts": [
            {
              "author": {
                "id": "1",
                "name": "Ada Lovelace",
                "posts": [
                  {
                    "id": "1",
                    "title": "Hello, World!",
                  },
                ],
              },
              "id": "1",
              "title": "Hello, World!",
            },
            {
              "author": {
                "id": "2",
                "name": "Alan Turing",
                "posts": [
                  {
                    "id": "2",
                    "title": "My Story",
                  },
                ],
              },
              "id": "2",
              "title": "My Story",
            },
          ],
        },
        "path": [],
      },
    ],
  },
  {
    "hasNext": false,
    "incremental": [
      {
        "data": {
          "users": [
            {
              "id": "1",
              "name": "Ada Lovelace",
              "posts": [
                {
                  "author": {
                    "id": "1",
                    "name": "Ada Lovelace",
                  },
                  "id": "1",
                  "title": "Hello, World!",
                },
              ],
            },
            {
              "id": "2",
              "name": "Alan Turing",
              "posts": [
                {
                  "author": {
                    "id": "2",
                    "name": "Alan Turing",
                  },
                  "id": "2",
                  "title": "My Story",
                },
              ],
            },
          ],
        },
        "path": [],
      },
    ],
  },
]
`);
  });
  it('defers the nested fields', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          users {
            id
            name
            ... @defer {
              posts {
                id
                ... @defer {
                  title
                }
                author {
                  id
                  ... @defer {
                    name
                  }
                }
              }
            }
          }
          ... @defer {
            posts {
              id
              title
              author {
                id
                ... @defer {
                  name
                }
                posts {
                  id
                  title
                }
              }
            }
          }
        }
      `),
    });
    assertAsyncIterable(result);
    const values = [];
    for await (const value of result) {
      if (value.incremental?.some(v => v.errors?.length)) {
        throw new Error(`Unexpected on incremental response: ${inspect(value, false, Infinity)}`);
      }
      if (value.errors) {
        throw new Error(`Unexpected error: ${value.errors}`);
      }
      values.push(value);
    }
    expect(values).toMatchInlineSnapshot(`
[
  {
    "data": {
      "users": [
        {
          "id": "1",
          "name": "Ada Lovelace",
        },
        {
          "id": "2",
          "name": "Alan Turing",
        },
      ],
    },
    "hasNext": true,
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "data": {
          "posts": null,
        },
        "path": [
          "users",
          0,
        ],
      },
      {
        "data": {
          "posts": null,
        },
        "path": [
          "users",
          1,
        ],
      },
    ],
  },
  {
    "hasNext": true,
    "incremental": [
      {
        "data": {
          "posts": [
            {
              "author": {
                "id": "1",
                "posts": [
                  {
                    "id": "1",
                    "title": "Hello, World!",
                  },
                ],
              },
              "id": "1",
              "title": "Hello, World!",
            },
            {
              "author": {
                "id": "2",
                "posts": [
                  {
                    "id": "2",
                    "title": "My Story",
                  },
                ],
              },
              "id": "2",
              "title": "My Story",
            },
          ],
        },
        "path": [],
      },
    ],
  },
  {
    "hasNext": false,
    "incremental": [
      {
        "data": null,
        "errors": [
          [GraphQLError: Cannot return null for non-nullable field User.name.],
        ],
        "path": [
          "posts",
          0,
          "author",
        ],
      },
      {
        "data": null,
        "errors": [
          [GraphQLError: Cannot return null for non-nullable field User.name.],
        ],
        "path": [
          "posts",
          1,
          "author",
        ],
      },
    ],
  },
]
`);
  });
});
