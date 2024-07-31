import { debug } from 'console';
import { GraphQLObjectType, Kind, OperationTypeNode, parse } from 'graphql';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

describe('batch delegation within basic stitching example', () => {
  test('works with single keys', async () => {
    let numCalls = 0;

    const chirpSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Chirp {
          chirpedAtUserId: ID!
        }

        type Query {
          trendingChirps: [Chirp]
        }
      `,
      resolvers: {
        Query: {
          trendingChirps: () => [{ chirpedAtUserId: 1 }, { chirpedAtUserId: 2 }],
        },
      },
    });

    // Mocked author schema
    const authorSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          email: String
        }

        type Query {
          usersByIds(ids: [ID!]): [User]
        }
      `,
      resolvers: {
        Query: {
          usersByIds: (_root, args) => {
            numCalls++;
            return args.ids.map((id: string) => ({ email: `${id}@test.com` }));
          },
        },
      },
    });

    const linkTypeDefs = /* GraphQL */ `
      extend type Chirp {
        chirpedAtUser: User
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [chirpSchema, authorSchema],
      typeDefs: linkTypeDefs,
      resolvers: {
        Chirp: {
          chirpedAtUser: {
            selectionSet: `{ chirpedAtUserId }`,
            resolve(chirp, _args, context, info) {
              return batchDelegateToSchema({
                schema: authorSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'usersByIds',
                key: chirp.chirpedAtUserId,
                argsFromKeys: ids => ({ ids }),
                context,
                info,
              });
            },
          },
        },
      },
    });

    const query = /* GraphQL */ `
      query {
        trendingChirps {
          chirpedAtUser {
            email
          }
        }
      }
    `;

    const result = await execute({ schema: stitchedSchema, document: parse(query) });

    expect(numCalls).toEqual(1);

    if (isIncrementalResult(result)) throw Error('result is incremental');

    expect(result.errors).toBeUndefined();
    const chirps: any = result.data!['trendingChirps'];
    expect(chirps[0].chirpedAtUser.email).not.toBe(null);
  });

  test('works with key arrays', async () => {
    let numCalls = 0;

    const postsSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Post {
          id: ID!
          title: String
        }

        type Query {
          posts(ids: [ID]!): [Post]!
        }
      `,
      resolvers: {
        Query: {
          posts: (_, args) => {
            numCalls += 1;
            return args.ids.map((id: unknown) => ({ id, title: `Post ${id}` }));
          },
        },
      },
    });

    const usersSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          postIds: [ID]!
        }

        type Query {
          users(ids: [ID!]!): [User]!
        }
      `,
      resolvers: {
        Query: {
          users: (_, args) => {
            return args.ids.map((id: unknown) => {
              return { id, postIds: [Number(id) + 1, Number(id) + 2] };
            });
          },
        },
      },
    });

    const linkTypeDefs = /* GraphQL */ `
      extend type User {
        posts: [Post]!
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [postsSchema, usersSchema],
      typeDefs: linkTypeDefs,
      resolvers: {
        User: {
          posts: {
            selectionSet: `{ postIds }`,
            resolve(user, _args, context, info) {
              return batchDelegateToSchema({
                schema: postsSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'posts',
                key: user.postIds,
                context,
                info,
              });
            },
          },
        },
      },
    });

    const query = /* GraphQL */ `
      query {
        users(ids: [1, 7]) {
          id
          posts {
            id
            title
          }
        }
      }
    `;

    const result = await execute({ schema: stitchedSchema, document: parse(query) });
    expect(numCalls).toEqual(1);

    if (isIncrementalResult(result)) throw Error('result is incremental');

    expect(result.data).toEqual({
      users: [
        {
          id: '1',
          posts: [
            { id: '2', title: 'Post 2' },
            { id: '3', title: 'Post 3' },
          ],
        },
        {
          id: '7',
          posts: [
            { id: '8', title: 'Post 8' },
            { id: '9', title: 'Post 9' },
          ],
        },
      ],
    });
  });

  test('works with keys passed to lazyOptionsFn', async () => {
    let numCalls = 0;

    const postsSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Post {
          id: ID!
          title: String
        }

        type Page {
          posts(ids: [ID]!): [Post]!
        }

        type Query {
          page: Page
        }
      `,
      resolvers: {
        Page: {
          posts: (_, args) => {
            numCalls += 1;
            return args.ids.map((id: unknown) => ({ id, title: `Post ${id}` }));
          },
        },
        Query: {
          page: () => ({}),
        },
      },
    });

    const usersSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          postIds: [ID]!
        }

        type Query {
          users(ids: [ID!]!): [User]!
        }
      `,
      resolvers: {
        Query: {
          users: (_, args) => {
            return args.ids.map((id: unknown) => {
              return { id, postIds: [Number(id) + 1, Number(id) + 2] };
            });
          },
        },
      },
    });

    const linkTypeDefs = /* GraphQL */ `
      extend type User {
        posts: [Post]!
      }
    `;

    const stitchedSchema = stitchSchemas({
      subschemas: [postsSchema, usersSchema],
      typeDefs: linkTypeDefs,
      resolvers: {
        User: {
          posts: {
            selectionSet: `{ postIds }`,
            resolve(user, _args, context, info) {
              return batchDelegateToSchema({
                schema: postsSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'page',
                key: user.postIds,
                context,
                info,
                valuesFromResults: ({ posts }) => posts,
                lazyOptionsFn: (options, keys) => ({
                  ...options,
                  returnType: postsSchema.getType('Page') as GraphQLObjectType,
                  args: {},
                  selectionSet: {
                    kind: Kind.SELECTION_SET,
                    selections: [
                      {
                        kind: Kind.FIELD,
                        name: { kind: Kind.NAME, value: 'posts' },
                        arguments: [
                          {
                            kind: Kind.ARGUMENT,
                            name: { kind: Kind.NAME, value: 'ids' },
                            value: {
                              kind: Kind.LIST,
                              values: keys.map(key => ({
                                kind: Kind.INT,
                                value: key,
                              })),
                            },
                          },
                        ],
                        selectionSet: info.fieldNodes[0].selectionSet,
                      },
                    ],
                  },
                }),
              });
            },
          },
        },
      },
    });

    const query = /* GraphQL */ `
      query {
        users(ids: [1, 7]) {
          id
          posts {
            id
            title
          }
        }
      }
    `;

    const result = await execute({ schema: stitchedSchema, document: parse(query) });
    expect(numCalls).toEqual(1);

    if (isIncrementalResult(result)) throw Error('result is incremental');

    expect(result.data).toEqual({
      users: [
        {
          id: '1',
          posts: [
            { id: '2', title: 'Post 2' },
            { id: '3', title: 'Post 3' },
          ],
        },
        {
          id: '7',
          posts: [
            { id: '8', title: 'Post 8' },
            { id: '9', title: 'Post 9' },
          ],
        },
      ],
    });
  });

  test('works with merged types and array batching', async () => {
    let queries = {
      schema1: [],
      schema2: [],
    };
    const schema1 = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          title: String
        }

        type Query {
          book(id: ID!): Book
        }
      `,
      resolvers: {
        Query: {
          book: (_obj, _args, _ctx, info) => {
            addToQueries(info, 'schema1');
            return { id: '1', title: 'Book 1' };
          },
        },
      },
    });

    const schema2 = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          isbn: Int
        }

        type Query {
          books(id: [ID!]!): [Book]
        }
      `,
      resolvers: {
        Query: {
          books: (_obj, _args, _ctx, info) => {
            addToQueries(info, 'schema2');
            return [{ id: '1', isbn: 123 }];
          },
        },
      },
    });

    const addToQueries = (info: any, schema: string) =>
      info.operation.selectionSet.selections.forEach((s: any) => {
        s.selectionSet.selections.forEach((s: any) => {
          queries[schema].push(s.name.value);
        });
      });

    const stitchedSchemaWithValuesFromResults = stitchSchemas({
      subschemas: [
        {
          schema: schema1,
          merge: {
            Book: {
              selectionSet: '{ id }',
              fieldName: 'book',
            },
          },
        },
        {
          schema: schema2,
          merge: {
            Book: {
              selectionSet: '{ id }',
              fieldName: 'books',
              key: ({ id }) => id,
              argsFromKeys: ids => ({ id: ids }),
              valuesFromResults: ({ results }, keys) => {
                const response = Object.fromEntries(results.map(result => [result.id, result]));

                return keys.map(key => response[key] ?? { id: key });
              },
            },
          },
        },
      ],
      mergeTypes: true,
    });

    const stitchedSchemaWithoutValuesFromResults = stitchSchemas({
      subschemas: [
        {
          schema: schema1,
          merge: {
            Book: {
              selectionSet: '{ id }',
              fieldName: 'book',
            },
          },
        },
        {
          schema: schema2,
          merge: {
            Book: {
              selectionSet: '{ id }',
              fieldName: 'books',
              key: ({ id }) => id,
              argsFromKeys: ids => ({ id: ids }),
            },
          },
        },
      ],
      mergeTypes: true,
    });

    const query = /* GraphQL */ `
      query {
        book(id: "1") {
          id
          title
          isbn
        }
      }
    `;

    const goodResult = await execute({
      schema: stitchedSchemaWithoutValuesFromResults,
      document: parse(query),
    });
    const badResult = await execute({
      schema: stitchedSchemaWithValuesFromResults,
      document: parse(query),
    });

    if (isIncrementalResult(goodResult)) throw Error('result is incremental');
    if (isIncrementalResult(badResult)) throw Error('result is incremental');

    // queries from both goodResult and badResult in the arrays
    expect(queries).toEqual({
      schema1: ['id', 'title', '__typename', 'id', 'id', 'title', '__typename', 'id'],
      schema2: ['id', 'isbn', 'id', 'isbn'],
    });

    expect(goodResult.data).toEqual({
      book: {
        id: '1',
        title: 'Book 1',
        isbn: 123,
      },
    });

    expect(badResult.data).toEqual({
      book: {
        id: '1',
        title: 'Book 1',
        isbn: 123,
      },
    });
  });
});
