// The below is meant to be an alternative canonical schema stitching example
// which relies on type merging.

import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { addMocksToSchema } from '@graphql-tools/mock';

import { stitchSchemas } from '../src/stitchSchemas';

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


const failureSchema = addMocksToSchema({
  schema: makeExecutableSchema({
    typeDefs: `
      type User {
        id: ID!
        fail: Boolean
      }

      type Query {
        userById(id: ID!): User
      }
    `
  }),
  mocks: {
    Query() {
      return ({
        userById() { throw new Error("failure message"); }
      })
    },
  }
})

const stichedFailureSchema = stitchSchemas({
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
      schema: stitchedSchema,
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
})

describe('merging using type merging', () => {
  test('works', async () => {
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

  test("handle toplevel failures on subschema queries", async() => {
    const query = `
      query {
        userById(id: 5) {  id  email fail }
      }
    `

    const result = await graphql(stichedFailureSchema, query)

    expect(result.errors).not.toBeUndefined()
    expect(result.data).toMatchObject({ userById: { fail: null }})
    expect(result.errors).toMatchObject([{
      message: "failure message",
      path: ["userById", "fail"]
    }])
  })
});
