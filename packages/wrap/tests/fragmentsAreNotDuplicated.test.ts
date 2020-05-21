import { ExecutionResult, graphql } from 'graphql';

import { wrapSchema } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema'
import { addMocksToSchema } from '@graphql-tools/mock';

describe('Merging schemas', () => {
  test('should not throw `There can be only one fragment named "FieldName"` errors', async () => {
    let originalSchema = makeExecutableSchema({
      typeDefs: rawSchema,
    });

    originalSchema = addMocksToSchema({ schema: originalSchema });

    const originalResult = await graphql(
      originalSchema,
      query,
      undefined,
      undefined,
      variables,
    );
    assertNoDuplicateFragmentErrors(originalResult);

    const transformedSchema = wrapSchema(originalSchema, []);

    const transformedResult = await graphql(
      transformedSchema,
      query,
      undefined,
      undefined,
      variables,
    );
    assertNoDuplicateFragmentErrors(transformedResult);
  });
});

const rawSchema = `
  type Post {
    id: ID!
    title: String!
    owner: User!
  }

  type User {
    id: ID!
    email: String
  }

  type Query {
    post(id: ID!): Post
  }
`;

const query = `
  query getPostById($id: ID!) {
    post(id: $id) {
      ...Post
      owner {
        ...PostOwner
        email
      }
    }
  }

  fragment Post on Post {
    id
    title
    owner {
      ...PostOwner
    }
  }

  fragment PostOwner on User {
    id
  }
`;

const variables = {
  id: 123,
};

function assertNoDuplicateFragmentErrors(result: ExecutionResult) {
  // Run assertion against each array element for better test failure output.
  if (result.errors != null) {
    result.errors.forEach((error) => expect(error.message).toBe(''));
  }
}
