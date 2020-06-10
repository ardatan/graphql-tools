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
          }
        }
      }
    `;

    const result = await graphql(stitchedSchema, query);

    expect(result.errors).toBeUndefined();
    expect(result.data.userById.chirps[1].id).not.toBe(null);
    expect(result.data.userById.chirps[1].text).not.toBe(null);
    expect(result.data.userById.chirps[1].author.email).not.toBe(null);
  });
});
