import { linkToExecutor } from '@graphql-tools/links';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloLink, Observable } from 'apollo-link';
import gql from 'graphql-tag';

import { stitchSchemas } from '../src/stitchSchemas';
import { ExecutionResult, GraphQLError, graphql } from 'graphql';

export const typeDefs = gql`
  input LoginInput {
    username: String
    password: String
  }

  type LoginPayload {
    accessToken: String!
  }

  type Query {
    meh: Boolean
  }

  type Mutation {
    login(input: LoginInput!): LoginPayload!
  }
`;

const link = new ApolloLink(operation => {
  return new Observable(observer => {
    const responses: Record<string, ExecutionResult> = {
      'whatever@goodpass': {
        data: {
          login: {
            accessToken: 'at',
          },
        },
      },
      'whatever@wrongpass': {
        errors: [
          ({
            message: 'INVALID_CREDENTIALS',
            path: ['login'],
          } as unknown) as GraphQLError,
        ],
        data: null,
      },
    };

    const response = responses[`${operation.variables.username}@${operation.variables.password}`];
    if (response) {
      observer.next(response);
      observer.complete();
    } else {
      observer.error(new Error('UNEXPECTED_ERROR'));
    }
  });
});

const authSchema = wrapSchema({
  executor: linkToExecutor(link),
  schema: makeExecutableSchema({ typeDefs }),
});

const stitchedSchema = stitchSchemas({
  subschemas: [{ schema: authSchema }],
});

describe('Repro for issue #1571', () => {
  it.each`
    username      | password      | response
    ${'whatever'} | ${'goodpass'} | ${{
      data: {
        login: {
          accessToken: 'at',
        },
      },
    }}
    ${'whatever'} | ${'wrongpass'} | ${{
      errors: [{
        message: 'INVALID_CREDENTIALS',
        path: ['login'],
      }],
      data: null,
    }}
  `(
    'should return the expected response for $username@$password',
    async ({ username, password, response }: { username: string; password: string; response: string }) => {
      const stitchedResult = await graphql(
        stitchedSchema,
        `
          mutation Login($username: String!, $password: String!) {
            login(input: { username: $username, password: $password }) {
              accessToken
            }
          }
        `,
        undefined,
        undefined,
        { username, password },
      );
      expect(stitchedResult).toEqual(response);
    },
  );
});
