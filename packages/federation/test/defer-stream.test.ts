import { inspect } from 'util';
import { GraphQLSchema, parse, print } from 'graphql';
import _ from 'lodash';
import { IntrospectAndCompose, LocalGraphQLDataSource } from '@apollo/gateway';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { asArray, ExecutionResult, mergeDeep } from '@graphql-tools/utils';
import { assertAsyncIterable } from '../../loaders/url/tests/test-utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

function mergeIncrementalResults(values: ExecutionResult[]) {
  const result: ExecutionResult = {};
  for (const value of values) {
    if (value.data) {
      if (!result.data) {
        result.data = value.data;
      } else {
        result.data = mergeDeep([result.data, value.data]);
      }
    }
    if (value.errors) {
      result.errors = result.errors || [];
      result.errors = [...result.errors, ...value.errors];
    }
    if (value.incremental) {
      for (const incremental of value.incremental) {
        if (incremental.path) {
          result.data = result.data || {};
          const incrementalItems = incremental.items
            ? asArray(incremental.items).filter(item => item != null)
            : [];
          if (incremental.data != null) {
            incrementalItems.unshift(incremental.data);
          }
          for (const incrementalItem of incrementalItems) {
            if (!incremental.path.length) {
              result.data = mergeDeep([result.data, incrementalItem]);
            } else {
              const existingData = _.get(result.data, incremental.path);
              if (!existingData) {
                _.set(result.data, incremental.path, incrementalItem);
              } else {
                _.set(result.data, incremental.path, mergeDeep([existingData, incrementalItem]));
              }
            }
          }
        }
        if (incremental.errors) {
          result.errors = result.errors || [];
          result.errors = [...result.errors, ...incremental.errors];
        }
      }
    }
  }
  return result;
}

describe('Defer/Stream', () => {
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
        usersStream: [User]
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
        usersStream: async function* usersStream() {
          for (const user of users) {
            yield user;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        },
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
        title: String
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
        post: (_, { id }) => resolveWithDelay(() => posts.find(post => post.id === id), 300),
        posts: () => resolveWithDelay(() => posts, 300),
        postsStream: async function* postsStream() {
          for (const post of posts) {
            yield post;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        },
      },
    },
  });
  let schema: GraphQLSchema;
  let finalResult: ExecutionResult;
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
          const origExecutor = createDefaultExecutor(usersSubgraph);
          subschemaConfig.executor = async function usersExecutor(execReq) {
            const result = await origExecutor(execReq);
            if (process.env['DEBUG']) {
              console.log({
                subgraphName,
                document: print(execReq.document),
                result: inspect(result, false, Infinity),
              });
            }
            return result;
          };
        } else if (subgraphName === 'posts') {
          const origExecutor = createDefaultExecutor(postsSubgraph);
          subschemaConfig.executor = async function postsExecutor(execReq) {
            const result = await origExecutor(execReq);
            if (process.env['DEBUG']) {
              console.log({
                subgraphName,
                document: print(execReq.document),
                result: inspect(result, false, Infinity),
              });
            }
            return result;
          };
        } else {
          throw new Error(`Unknown subgraph: ${subgraphName}`);
        }
      },
    });
    finalResult = (await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
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
      `),
    })) as ExecutionResult;
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
    expect(values).toMatchSnapshot('defer-root-fields');
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual(finalResult);
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
    expect(values).toMatchSnapshot('defer-nested-fields');
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual(finalResult);
  });
  it('streams', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          usersStream @stream {
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
    expect(values).toMatchSnapshot('stream');
    const mergedResult = mergeIncrementalResults(values);
    expect(mergedResult).toEqual({
      data: {
        usersStream: [
          {
            id: '1',
            name: 'Ada Lovelace',
            posts: [
              {
                id: '1',
                title: 'Hello, World!',
                author: {
                  id: '1',
                  name: 'Ada Lovelace',
                },
              },
            ],
          },
          {
            id: '2',
            name: 'Alan Turing',
            posts: [
              {
                id: '2',
                title: 'My Story',
                author: {
                  id: '2',
                  name: 'Alan Turing',
                },
              },
            ],
          },
        ],
      },
    });
  });
});
