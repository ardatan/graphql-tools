import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute } from '@graphql-tools/executor';
import { parse } from 'graphql';
import { handleRelaySubschemas, stitchSchemas } from '../src/index.js';

const users = [
  {
    id: 'User_0',
    name: 'John Doe',
  },
  {
    id: 'User_1',
    name: 'Jane Doe',
  },
];

const posts = [
  { id: 'Post_0', content: 'Lorem Ipsum', userId: 'User_1' },
  { id: 'Post_1', content: 'Dolor Sit Amet', userId: 'User_0' },
];

describe('Relay', () => {
  it('should', async () => {
    const userSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          node(id: ID!): Node
        }
        interface Node {
          id: ID!
        }
        type User implements Node {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Node: {
          __resolveType: ({ id }: { id: string }) => id.split('_')[0],
        },
        Query: {
          node: (_, { id }) => {
            if (id.startsWith('User_')) {
              return users.find(user => user.id === id);
            }
            return {
              id,
            };
          },
        },
      },
    });
    const userResult = (await execute({
      schema: userSchema,
      document: parse(/* GraphQL */ `
        fragment User on User {
          id
          name
        }
        query UserSchemaQuery {
          user0: node(id: "User_0") {
            ...User
          }
          user1: node(id: "User_1") {
            ...User
          }
        }
      `),
    })) as any;
    expect(userResult.data?.['user0']?.name).toBe(users[0].name);
    expect(userResult.data?.['user1']?.name).toBe(users[1].name);
    const postSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          node(id: ID!): Node
        }
        interface Node {
          id: ID!
        }
        type User implements Node {
          id: ID!
          posts: [Post]
        }
        type Post implements Node {
          id: ID!
          content: String!
        }
      `,
      resolvers: {
        Node: {
          __resolveType: ({ id }: { id: string }) => id.split('_')[0],
        },
        Query: {
          node: (_, { id }) => {
            if (id.startsWith('Post_')) {
              return posts.find(post => post.id === id);
            }
            return {
              id,
            };
          },
        },
        User: {
          posts: ({ id }) => posts.filter(({ userId }) => id === userId),
        },
      },
    });
    const postResult = (await execute({
      schema: postSchema,
      document: parse(/* GraphQL */ `
        fragment Post on Post {
          id
          content
        }
        fragment User on User {
          id
          posts {
            id
            content
          }
        }
        query PostSchemaQuery {
          post0: node(id: "Post_0") {
            ...Post
          }
          post1: node(id: "Post_1") {
            ...Post
          }
          user0: node(id: "User_0") {
            ...User
          }
          user1: node(id: "User_1") {
            ...User
          }
        }
      `),
    })) as any;
    expect(postResult.data?.['post0']?.content).toBe(posts[0].content);
    expect(postResult.data?.['post1']?.content).toBe(posts[1].content);
    expect(postResult.data?.['user0']?.id).toBe(users[0].id);
    expect(postResult.data?.['user0']?.posts[0].content).toBe(posts[1].content);
    expect(postResult.data?.['user1']?.id).toBe(users[1].id);
    expect(postResult.data?.['user1']?.posts[0].content).toBe(posts[0].content);

    const stitchedSchema = stitchSchemas({
      subschemas: handleRelaySubschemas([{ schema: postSchema }, { schema: userSchema }], id => id.split('_')[0]),
    });

    const stitchedResult = (await execute({
      schema: stitchedSchema,
      document: parse(/* GraphQL */ `
        fragment Post on Post {
          id
          content
        }
        fragment User on User {
          id
          name
          posts {
            id
            content
          }
        }
        query PostSchemaQuery {
          post0: node(id: "Post_0") {
            ...Post
          }
          post1: node(id: "Post_1") {
            ...Post
          }
          user0: node(id: "User_0") {
            ...User
          }
          user1: node(id: "User_1") {
            ...User
          }
        }
      `),
    })) as any;

    expect(stitchedResult.data?.['post0']?.content).toBe(posts[0].content);
    expect(stitchedResult.data?.['post1']?.content).toBe(posts[1].content);
    expect(stitchedResult.data?.['user0']?.name).toBe(users[0].name);
    expect(stitchedResult.data?.['user0']?.posts[0].content).toBe(posts[1].content);
    expect(stitchedResult.data?.['user1']?.name).toBe(users[1].name);
    expect(stitchedResult.data?.['user1']?.posts[0].content).toBe(posts[0].content);
  });
});
