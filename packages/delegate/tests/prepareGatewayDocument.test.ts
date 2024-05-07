import { parse, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { prepareGatewayDocument } from '../src/prepareGatewayDocument';
import '../../testing/to-be-similar-gql-doc';

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
});
