import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute } from '@graphql-tools/executor';
import { parse } from 'graphql';
import { handleRelaySubschemas, stitchSchemas } from '../src/index.js';

function decodeBase64(str: string) {
  return Buffer.from(str, 'base64').toString('utf-8');
}
function encodeBase64(str: string) {
  return Buffer.from(str, 'utf-8').toString('base64');
}
function extractGlobalId(globalId: string) {
  const [type, id] = decodeBase64(globalId).split(':');
  return { type, id };
}
function makeGlobalId(type: string, id: string) {
  return encodeBase64(`${type}:${id}`);
}

const users = [
  {
    id: '0',
    name: 'John Doe',
  },
  {
    id: '1',
    name: 'Jane Doe',
  },
];

const posts = [
  { id: '0', content: 'Lorem Ipsum', userId: users[1] },
  { id: '1', content: 'Dolor Sit Amet', userId: users[0] },
];

describe.skip('Relay', () => {
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
          __resolveType: ({ id }: { id: string }) => extractGlobalId(id)?.type,
          id: ({ __typename, id }: { __typename: string; id: string }) => makeGlobalId(__typename, id),
        },
        Query: {
          node: (_, { id: globalId }) => {
            const { type, id } = extractGlobalId(globalId);
            switch (type) {
              case 'User':
                return users.find(user => user.id === id);
            }
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
          user0: node(id: "${makeGlobalId('User', users[0].id)}") {
            ...User
          }
          user1: node(id: "${makeGlobalId('User', users[1].id)}") {
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
          __resolveType: ({ id }: { id: string }) => extractGlobalId(id)?.type,
          id: ({ __typename, id }: { __typename: string; id: string }) => makeGlobalId(__typename, id),
        },
        Query: {
          node: (_, { id: globalId }) => {
            const { type, id } = extractGlobalId(globalId);
            switch (type) {
              case 'Post':
                return posts.find(post => post.id === id);
              case 'User':
                return { id };
            }
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
          post0: node(id: "${makeGlobalId('Post', posts[0].id)}") {
            ...Post
          }
          post1: node(id: "${makeGlobalId('Post', posts[1].id)}") {
            ...Post
          }
          user0: node(id: "${makeGlobalId('User', users[0].id)}") {
            ...User
          }
          user1: node(id: "${makeGlobalId('User', users[1].id)}") {
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
      subschemas: handleRelaySubschemas([{ schema: postSchema }, { schema: userSchema }], id => id.split(':')[0]),
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
