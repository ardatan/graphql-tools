import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Executor, Subscriber } from '@graphql-tools/delegate';
import { stitchSchemas } from '../src/stitchSchemas';

describe('remote executors and subscribers', () => {
  const postsSchema = makeExecutableSchema({
    typeDefs: `
      type Post {
        message: String!
      }
      type Query {
        posts: [Post]!
      }
      type Mutation {
        createPost(message: String!): Post
      }
      type Subscription {
        newPost: Post
      }
    `,
    resolvers: {
      Query: {
        posts: () => [{ message: 'yo' }],
      },
      Mutation: {
        createPost: (_, { message }) => ({ message }),
      },
      Subscription: {
        newPost: {
          subscribe: () => 1
        }
      }
    }
  });

  test('calls executor for query operations', async () => {
    let calls = 0;
    const executor: Executor = async () => {
      calls += 1;
      return { data: { posts: [{ message: 'yo' }] } };
    };

    const stitchedSchema = stitchSchemas({
      subschemas: [{
        schema: postsSchema,
        executor,
      }]
    });

    const { data } = await graphql(stitchedSchema, `query { posts { message } }`);
    expect(data.posts[0].message).toEqual('yo');
    expect(calls).toEqual(1);
  });

  test('calls executor for mutation operations', async () => {
    let calls = 0;
    const executor: Executor = async () => {
      calls += 1;
      return { data: { createPost: { message: 'hello' } } };
    };

    const stitchedSchema = stitchSchemas({
      subschemas: [{
        schema: postsSchema,
        executor,
      }]
    });

    const { data } = await graphql(stitchedSchema, `mutation { createPost(message: "hello") { message } }`);
    expect(data.createPost.message).toEqual('hello');
    expect(calls).toEqual(1);
  });

  test('calls subscriber for subscription operations', async () => {
    let calls = 0;
    const subscriber: Subscriber = async () => {
      calls += 1;
      return async function* sendMessages() {
        for (const message of ['hello', 'goodbye']) {
          yield { newPost: { message } };
        }
      };
    };

    const stitchedSchema = stitchSchemas({
      subschemas: [{
        schema: postsSchema,
        subscriber,
      }]
    });

    await graphql(stitchedSchema, `subscription { newPost { message } }`);
    expect(calls).toEqual(1);
  });
});
