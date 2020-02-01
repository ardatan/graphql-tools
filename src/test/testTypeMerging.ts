/* tslint:disable:no-unused-expression */

// The below is meant to be an alternative canonical schema stitching example
// which relies on type merging.

import { expect } from 'chai';
import { graphql } from 'graphql';
import {
  mergeSchemas,
  addMocksToSchema,
  makeExecutableSchema,
} from '../index';

const chirpSchema = makeExecutableSchema({
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

addMocksToSchema({ schema: chirpSchema });

const authorSchema = makeExecutableSchema({
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

addMocksToSchema({ schema: authorSchema });

const mergedSchema = mergeSchemas({
  subschemas: [{
    schema: chirpSchema,
    merge: {
      User: {
        fieldName: 'userById',
        args: originalResult => ({ id: originalResult.id }),
        selectionSet: '{ id }',
      }
    },
  }, {
    schema: authorSchema,
    merge: {
      User: {
        fieldName: 'userById',
        args: originalResult => ({ id: originalResult.id }),
        selectionSet: '{ id }',
      }
    },
  }],
  mergeTypes: true,
});

describe('merging using type merging', () => {
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
