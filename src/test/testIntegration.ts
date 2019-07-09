/* tslint:disable:no-unused-expression */

// The below is meant to be an alternative canonical schema stitching example
// which intermingles local (mocked) resolvers and stitched schemas and does
// not require use of the fragment field, because it follows best practices of
// always returning the necessary object fields:
// https://medium.com/paypal-engineering/graphql-resolvers-best-practices-cd36fdbcef55

// The fragment field is still necessary when working with a remote schema
// where this is not possible.

import { expect } from 'chai';
import { graphql } from 'graphql';
import { delegateToSchema, mergeSchemas } from '../index';
import { addMockFunctionsToSchema } from '../mock';

const chirpTypeDefs = `
  type Chirp {
    id: ID!
    text: String
    authorId: ID!
    author: User
  }
`;

const authorTypeDefs = `
  type User {
    id: ID!
    email: String
    chirps: [Chirp]
  }
`;

const schemas = {};
const getSchema = (name: string) => schemas[name];

const chirpSchema = mergeSchemas({
  schemas: [
    chirpTypeDefs,
    authorTypeDefs,
    `
      type Query {
        chirpById(id: ID!): Chirp
        chirpsByAuthorId(authorId: ID!): [Chirp]
      }
    `
  ],
  resolvers: {
    Chirp: {
      author: (chirp, args, context, info) => {
        return delegateToSchema({
          schema: getSchema('authorSchema'),
          operation: 'query',
          fieldName: 'userById',
          args: {
            id: chirp.authorId
          },
          context,
          info
        });
      }
    }
  }
});

addMockFunctionsToSchema({
  schema: chirpSchema,
  mocks: {
    Chirp: () => ({
      authorId: '1'
    }),
  },
  preserveResolvers: true
});

const authorSchema = mergeSchemas({
  schemas: [
    chirpTypeDefs,
    authorTypeDefs,
    `
      type Query {
        userById(id: ID!): User
      }
    `
  ],
  resolvers: {
    User: {
      chirps: (user, args, context, info) => {
        return delegateToSchema({
          schema: getSchema('chirpSchema'),
          operation: 'query',
          fieldName: 'chirpsByAuthorId',
          args: {
            authorId: user.id
          },
          context,
          info
        });
      }
    }
  }
});

addMockFunctionsToSchema({
  schema: authorSchema,
  mocks: {
    User: () => ({
      id: '1'
    }),
  },
  preserveResolvers: true
});

schemas['chirpSchema'] = chirpSchema;
schemas['authorSchema'] = authorSchema;

const mergedSchema = mergeSchemas({
  schemas: Object.keys(schemas).map(schemaName => schemas[schemaName])
});

describe('merging without specifying fragments', () => {
  it('works', async () => {
    const query = `
      query {
        userById(id: 5) {
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

    const result = await graphql(mergedSchema, query);

    expect(result.errors).to.be.undefined;
    expect(result.data.userById.chirps[1].id).to.not.be.null;
    expect(result.data.userById.chirps[1].text).to.not.be.null;
    expect(result.data.userById.chirps[1].author.email).to.not.be.null;
  });
});
