// The below is meant to be an alternative canonical schema stitching example
// which relies on type merging.

import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { addMocksToSchema } from '@graphql-tools/mock';

import { delegateToSchema } from '@graphql-tools/delegate';

import { stitchSchemas } from '../src/stitchSchemas';

describe('merging using type merging', () => {
  test('works', async () => {
    let chirpSchema = makeExecutableSchema({
      typeDefs: `
        type Chirp {
          id: ID!
          text: String
          author: User
          coAuthors: [User]
          authorGroups: [[User]]
        }

        type User {
          id: ID!
          chirps: [Chirp]
        }
        type Query {
          userById(id: ID!): User
        }
      `,
    });

    chirpSchema = addMocksToSchema({ schema: chirpSchema });

    let authorSchema = makeExecutableSchema({
      typeDefs: `
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

    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          schema: chirpSchema,
          merge: {
            User: {
              fieldName: 'userById',
              args: (originalResult) => ({ id: originalResult.id }),
              selectionSet: '{ id }',
            },
          },
        },
        {
          schema: authorSchema,
          merge: {
            User: {
              fieldName: 'userById',
              args: (originalResult) => ({ id: originalResult.id }),
              selectionSet: '{ id }',
            },
          },
        },
      ],
      mergeTypes: true,
    });

    const query = `
      query {
        userById(id: 5) {
          __typename
          chirps {
            id
            textAlias: text
            author {
              email
            }
            coAuthors {
              email
            }
            authorGroups {
              email
            }
          }
        }
      }
    `;

    const result = await graphql(stitchedSchema, query);

    expect(result.errors).toBeUndefined();
    expect(result.data.userById.__typename).toBe('User');
    expect(result.data.userById.chirps[1].id).not.toBe(null);
    expect(result.data.userById.chirps[1].text).not.toBe(null);
    expect(result.data.userById.chirps[1].author.email).not.toBe(null);
  });

  test("handle top level failures on subschema queries", async() => {
    let userSchema = makeExecutableSchema({
      typeDefs: `
        type User {
          id: ID!
          email: String
        }
        type Query {
          userById(id: ID!): User
        }
      `,
    });

    userSchema = addMocksToSchema({ schema: userSchema });

    const failureSchema = makeExecutableSchema({
      typeDefs: `
        type User {
          id: ID!
          fail: Boolean
        }

        type Query {
          userById(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          userById: () => { throw new Error("failure message"); },
        }
      }
    });

    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          schema: failureSchema,
          merge: {
            User: {
              fieldName: 'userById',
              selectionSet: '{ id }',
              args: (originalResult) => ({ id: originalResult.id }),
            }
          }
        },
        {
          schema: userSchema,
          merge: {
            User: {
              fieldName: 'userById',
              selectionSet: '{ id }',
              args: (originalResult) => ({ id: originalResult.id }),
            }
          }
        },
      ],
      mergeTypes: true
    });

    const query = `
      query {
        userById(id: 5) {  id  email fail }
      }
    `;

    const result = await graphql(stitchedSchema, query);

    expect(result.errors).not.toBeUndefined();
    expect(result.data).toMatchObject({ userById: { fail: null }});
    expect(result.errors).toMatchObject([{
      message: "failure message",
      path: ["userById", "fail"]
    }]);
  });

  test('merging types and type extensions should work together', async () => {
    const resultSchema = makeExecutableSchema({
      typeDefs: `
        type Query {
          resultById(id: ID!): String
        }
      `,
      resolvers: {
        Query: {
          resultById: () => 'ok',
        },
      },
    });

    const containerSchemaA = makeExecutableSchema({
      typeDefs: `
          type Container {
            id: ID!
            resultId: ID!
          }

          type Query {
            containerById(id: ID!): Container
          }
      `,
      resolvers: {
        Query: {
          containerById: () => ({ id: 'Container', resultId: 'Result' }),
        },
      },
    });

    const containerSchemaB = makeExecutableSchema({
      typeDefs: `
        type Container {
          id: ID!
        }

        type Query {
          containerById(id: ID!): Container
          rootContainer: Container!
        }
      `,
      resolvers: {
        Query: {
          containerById: () => ({ id: 'Container' }),
          rootContainer: () => ({ id: 'Container' }),
        },
      },
    });

    const schema = stitchSchemas({
      subschemas: [
        {
          schema: resultSchema,
        },
        {
          schema: containerSchemaA,
          merge: {
            Container: {
              fieldName: 'containerById',
              args: ({ id }) => ({ id }),
              selectionSet: '{ id }',
            },
          },
        },
        {
          schema: containerSchemaB,
          merge: {
            Container: {
              fieldName: 'containerById',
              args: ({ id }) => ({ id }),
              selectionSet: '{ id }',
            },
          },
        },
      ],
      mergeTypes: true,
      typeDefs: `
        extend type Container {
          result: String!
        }
      `,
      resolvers: {
        Container: {
          result: {
            selectionSet: `{ resultId }`,
            resolve(container, _args, context, info) {
              return delegateToSchema({
                schema: resultSchema,
                operation: 'query',
                fieldName: 'resultById',
                args: {
                  id: container.resultId,
                },
                context,
                info,
              });
            },
          },
        },
      },
    });

    const result = await graphql(
      schema,
      `
        query TestQuery {
          rootContainer {
            id
            result
          }
        }
      `,
    );

    const expectedResult = {
      data: {
        rootContainer: {
          id: 'Container',
          result: 'ok',
        }
      }
    }

    expect(result).toEqual(expectedResult);
  });

  test('merges types within an extension subtree', async () => {
    const networksSchema = makeExecutableSchema({
      typeDefs: `
        type Network {
          id: Int!
          name: String!
        }
        type Query {
          networks(ids: [Int!]!): [Network]!
        }
      `,
      resolvers: {
        Query: {
          networks(obj, args) {
            return args.ids.map(id => ({ id, name: `Network ${id}` }));
          }
        }
      }
    });

    const imagesSchema = makeExecutableSchema({
      typeDefs: `
        type Image {
          id: Int!
          url: String!
          network: Network!
        }
        type Network {
          id: Int!
        }
        type Query {
          image(id: Int!): Image
        }
      `,
      resolvers: {
        Query: {
          image(obj, args) {
            return { id: args.id, networkId: 1, url: 'https://domain.com/img.jpg' };
          }
        },
        Image: {
          network(obj) {
            return { id: obj.networkId };
          }
        }
      }
    });

    const postsSchema = makeExecutableSchema({
      typeDefs: `
        type Post {
          id: Int!
          imageId: Int!
        }
        type Query {
          post(id: Int!): Post
        }
      `,
      resolvers: {
        Query: {
          post(obj, args) {
            return { id: args.id, imageId: 1 };
          }
        }
      }
    });

    const gatewaySchema = stitchSchemas({
      subschemas: [
        {
          schema: networksSchema,
          merge: {
            Network: {
              fieldName: 'networks',
              selectionSet: '{ id }',
              key: ({ id }) => id,
              args: (ids) => ({ ids }),
            }
          }
        },
        {
          schema: imagesSchema,
          merge: { Network: {} }
        },
        {
          schema: postsSchema,
          merge: { Network: {} }
        },
      ],
      mergeTypes: true,
      typeDefs: `
        extend type Post {
          image: Image!
        }
      `,
      resolvers: {
        Post: {
          image: {
            selectionSet: '{ imageId }',
            resolve(obj, args, context, info) {
              return delegateToSchema({
                schema: imagesSchema,
                operation: 'query',
                fieldName: 'image',
                args: { id: obj.imageId },
                context,
                info
              });
            }
          }
        }
      }
    });

    const result = await graphql(gatewaySchema, `
      query {
        merged: image(id: 1) {
          network {
            name
          }
        }
        extended: post(id: 1) {
          image {
            url
          }
        }
        both: post(id: 1) {
          image {
            network {
              name
            }
          }
        }
      }
    `);

    const expectedResult = {
      data: {
        merged: {
          network: {
            name: 'Network 1'
          }
        },
        extended: {
          image: {
            url: 'https://domain.com/img.jpg'
          }
        },
        both: {
          image: {
            network: {
              name: 'Network 1'
            }
          }
        }
      }
    };

    expect(result).toEqual(expectedResult);
  });
});
