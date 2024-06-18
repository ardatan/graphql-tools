import { parse } from 'graphql';
import { IntrospectAndCompose, LocalGraphQLDataSource } from '@apollo/gateway';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { createPubSub } from '@graphql-yoga/subscription';
import {
  assertAsyncIterable,
  assertSingleExecutionValue,
} from '../../loaders/url/tests/test-utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Subscriptions in Federation', () => {
  it('works', async () => {
    const pubsub = createPubSub<{
      'comment:added': [postId: string, comment: (typeof comments)[0]];
    }>();
    const posts = [
      { id: '1', title: 'Post 1' },
      { id: '2', title: 'Post 2' },
    ];

    const comments = [{ id: '1', content: 'Comment 1', postId: '1' }];
    const postsSchema = buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        type Query {
          posts: [Post]
          post(id: ID!): Post
        }

        type Post @key(fields: "id") {
          id: ID!
          title: String!
        }
      `),
      resolvers: {
        Query: {
          posts: () => posts,
          post: (_, { id }) => posts.find(post => post.id === id),
        },
        Post: {
          __resolveReference: post => posts.find(({ id }) => id === post.id),
        },
      },
    });
    const commentsSchema = buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        type Comment @key(fields: "id") {
          id: ID!
          content: String!
          post: Post
        }

        extend type Post @key(fields: "id") {
          id: ID!
          comments: [Comment]
        }

        type Mutation {
          addComment(postId: ID!, content: String!): Comment
        }

        type Subscription {
          commentAdded(postId: ID!): Comment
        }
      `),
      resolvers: {
        Comment: {
          post: comment => posts.find(post => post.id === comment.postId),
        },
        Post: {
          __resolveReference: post => posts.find(({ id }) => id === post.id),
          comments: post => comments.filter(comment => comment.postId === post.id),
        },
        Mutation: {
          addComment: (_, { postId, content }) => {
            const comment = { id: String(comments.length + 1), content, postId };
            comments.push(comment);
            pubsub.publish('comment:added', postId, comment);
            return comment;
          },
        },
        Subscription: {
          commentAdded: {
            subscribe: (_, { postId }) => pubsub.subscribe('comment:added', postId),
            resolve: payload => payload,
          },
        },
      },
    });
    const { supergraphSdl, cleanup } = await new IntrospectAndCompose({
      subgraphs: [
        {
          name: 'posts',
          url: 'http://localhost:4001',
        },
        {
          name: 'comments',
          url: 'http://localhost:4002',
        },
      ],
    }).initialize({
      update() {},
      async healthCheck() {},
      getDataSource({ name }) {
        if (name === 'posts') {
          return new LocalGraphQLDataSource(postsSchema);
        }
        if (name === 'comments') {
          return new LocalGraphQLDataSource(commentsSchema);
        }
        throw new Error(`Unknown subgraph: ${name}`);
      },
    });
    await cleanup();
    const schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        let executor;
        if (subschemaConfig.name.toLowerCase() === 'posts') {
          executor = createDefaultExecutor(postsSchema);
        } else if (subschemaConfig.name.toLowerCase() === 'comments') {
          executor = createDefaultExecutor(commentsSchema);
        } else {
          throw new Error(`Unknown subgraph: ${subschemaConfig.name}`);
        }
        subschemaConfig.executor = executor;
      },
    });
    const asyncIterable = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        subscription {
          commentAdded(postId: "1") {
            id
            content
            post {
              id
              title
            }
          }
        }
      `),
    });
    assertAsyncIterable(asyncIterable);
    const asyncIterator = asyncIterable[Symbol.asyncIterator]();
    const commentAddedPayload$ = asyncIterator.next();
    const mutationResult = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        mutation {
          addComment(postId: "1", content: "New comment") {
            id
            content
            post {
              id
              title
            }
          }
        }
      `),
    });
    assertSingleExecutionValue(mutationResult);
    const commentAddedPayload = await commentAddedPayload$;
    expect(commentAddedPayload?.value?.data?.commentAdded).toEqual(
      mutationResult.data?.['addComment'],
    );
    expect(commentAddedPayload?.value?.data?.commentAdded?.post).toEqual(
      posts.find(post => post.id === '1'),
    );
  });
});
