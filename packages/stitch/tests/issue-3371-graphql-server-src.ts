import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { ExecutionRequest, ExecutionResult, Executor } from '@graphql-tools/utils';
import { graphql, print } from 'graphql';

/* eslint-disable @typescript-eslint/naming-convention, no-console */

async function invokeGraphQL<T = any>(
  serviceName: string,
  functionName: string,
  query: string,
  context: unknown,
  variables?: Record<string, unknown>
) {
  // Mock the lambda-tag response to avoid HTTP calls
  if (query.includes('userTags')) {
    return {
      data: {
        __typename: 'Query',
        userTags: [
          {
            user: {
              __typename: 'User',
              userId: 'u2',
            },
          },
        ],
      },
    } as unknown as ExecutionResult<T>;
  }

  // Mock the lambda-auth response to avoid HTTP calls
  if (query.startsWith('query ($graphqlTools0__v0_userId: ID!)')) {
    return {
      data: {
        graphqlTools0___typename: 'Query',
        graphqlTools0_user: {
          __typename: 'User',
          userId: 'u2',
          firstName: 'Two',
        },
      },
    } as unknown as ExecutionResult<T>;
  }

  return {} as ExecutionResult<T>;

  // // Emulate a partial `APIGatewayProxyEvent` needed for `ApolloServer`
  // const gatewayEvent: Pick<APIGatewayProxyEvent, 'body' | 'headers' | 'httpMethod' | 'path'> = {
  //   body: JSON.stringify({
  //     query,
  //     variables,
  //   }),
  //   headers: {
  //     ...(context.headers || {}),
  //     'content-type': 'application/json',
  //   },
  //   httpMethod: 'POST',
  //   path: '/graphql',
  // };
  // const response = await invoke<APIGatewayProxyResult>(serviceName, functionName, gatewayEvent);

  // return JSON.parse(response.body) as ExecutionResult<T>;
}

function createLambdaExecutor(serviceName: string, functionName = 'graphqlServer'): Executor<unknown> {
  return async <TReturn, TArgs, TRoot, TExtensions>({
    document,
    variables,
    context,
  }: ExecutionRequest<TArgs, unknown, TRoot, TExtensions>) => {
    console.log('DOCUMENT', print(document));
    const result = await invokeGraphQL<TReturn>(
      serviceName,
      functionName,
      print(document),
      context,
      variables as Record<string, unknown>
    );
    console.log('RESULT', result);
    return result;
  };
}

const authTypeDefs = /* GraphQL */ `
  interface UserInterface {
    firstName: String
    lastName: String
    userId: ID!
  }

  type User implements UserInterface {
    displayName: String
    firstName: String
    lastName: String
    userId: ID!
  }

  type Query {
    user(userId: ID!): User
  }
`;

const tagTypeDefs = /* GraphQL */ `
  # Minimal User type that is merged with the auth service
  type User {
    userId: ID!
  }

  type UserTag {
    tagId: ID!
    user: User!
    userId: ID!
  }

  type Query {
    userTags(userId: ID!): [UserTag!]!
  }
`;

const schema = stitchSchemas({
  subschemas: [
    {
      batch: true,
      executor: createLambdaExecutor('lambda-auth'),
      schema: makeExecutableSchema({ typeDefs: authTypeDefs }),

      merge: {
        User: {
          args: ({ userId }) => ({ userId }),
          fieldName: 'user',
          selectionSet: '{ userId }',
        },
      },
    },
    {
      executor: createLambdaExecutor('lambda-tag'),
      schema: makeExecutableSchema({ typeDefs: tagTypeDefs }),
    },
  ],
});

export const graphqlServer = async (event: any) => {
  const request =
    event.body && event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters || {};

  const result = await graphql(schema, request.query);

  return {
    body: JSON.stringify(result),
    headers: {
      'Content-Type': 'application/json',
    },
    statusCode: 200,
  };
};
