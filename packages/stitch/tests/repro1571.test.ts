import { ExecutionResult, GraphQLError, graphql, buildSchema } from 'graphql';

import { ApolloLink, Observable } from 'apollo-link';

import { linkToExecutor } from '@graphql-tools/links';
import { stitchSchemas } from '@graphql-tools/stitch';

const typeDefs = `
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
          // note that even for testing purposes, you have to return an Error object with a path here
          // which can conveniently be creating using the GraphQLError constructor
          new GraphQLError(
            'INVALID_CREDENTIALS',
            undefined,
            undefined,
            undefined,
            ['login'],
          )
        ],
        data: {
          login: null
        },
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

const authSchema = stitchSchemas({
  schemas: [{
    schema: buildSchema(typeDefs),
    executor: linkToExecutor(link),
  }]
});

const login = (username: string, password: string) => graphql(
  authSchema, `
    mutation Login($username: String!, $password: String!) {
      login(input: { username: $username, password: $password }) {
        accessToken
      }
    }
  `,
  undefined,
  undefined,
  { username, password }
);

describe('Repro for issue #1571', () => {
  it('can log in', async () => {
    const expectedResult: ExecutionResult = {
      data: {
        login: {
          accessToken: 'at',
        },
      },
    };

    const result = await login('whatever', 'goodpass');
    expect(result).toEqual(expectedResult);
  });

  it('can receive error', async () => {
    const expectedResult: ExecutionResult = {
      data: null,
      errors: [new GraphQLError(
        'INVALID_CREDENTIALS',
        undefined,
        undefined,
        undefined,
        ['login']
      )],
    }

    const result = await login('whatever', 'wrongpass');
    expect(result).toEqual(expectedResult);
  });
});
