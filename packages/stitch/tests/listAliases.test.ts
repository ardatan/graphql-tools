import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { delegateToSchema } from '@graphql-tools/delegate';

describe('stitching via list endpoints', () => {
  test('field aliases should still work', async () => {
    const usersSchema = makeExecutableSchema({
      typeDefs: `
        type User {
          id: ID!
          username: String
        }
        type Query {
          users(ids: [ID]!): [User]!
        }
      `,
      resolvers: {
        Query: {
          users(obj, args) {
            return args.ids.map(id => ({ id, username: `user${id}` }));
          }
        }
      }
    });

    const postsSchema = makeExecutableSchema({
      typeDefs: `
        type Post {
          id: ID!
          userId: ID!
        }
        type Query {
          post(id: ID!): Post!
        }
      `,
      resolvers: {
        Query: {
          post(obj, args) {
            return {
              id: args.id,
              userId: 55,
            };
          }
        }
      }
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        { schema: usersSchema },
        { schema: postsSchema },
      ],
      typeDefs: `
        extend type Post {
          user: User!
        }
      `,
      resolvers: {
        Post: {
          user: {
            selectionSet: '{ userId }',
            async resolve(post, args, context, info) {
              const users = await delegateToSchema({
                schema: usersSchema,
                operation: 'query',
                fieldName: 'users',
                args: { ids: [post.userId] },
                context,
                info
              });

              return users[0];
            }
          }
        }
      }
    });

    const result = await graphql(gatewaySchema, `
      query {
        post(id: 1) {
          user {
            id
            name: username
          }
        }
      }
    `);

    expect(result).toEqual({
      data: {
        post: {
          user: {
            id: '55',
            name: 'user55',
          },
        },
      },
    });

  });
});
