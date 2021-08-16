import { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { buildASTSchema, graphql, GraphQLSchema, print } from 'graphql';
import { gql } from 'graphql-tag';

import { stitchSchemas } from '../src/stitchSchemas';

const tags = [
  { tagId: 't1', label: 'One', userId: 'u1' },
  { tagId: 't2', label: 'Two', userId: 'u1' },
  { tagId: 't3', label: 'Three', userId: 'u2' },
];

const users = [
  { userId: 'u0', firstName: 'Zero', lastName: 'L Zero' },
  { userId: 'u1', firstName: 'One', lastName: 'L One' },
  { userId: 'u2', firstName: 'Two', lastName: 'L Two' },
];

const tagTypeDefs = gql`
  type User {
    userId: ID!
  }

  type UserTag {
    tagId: ID!
    label: String!

    user: User!
    userId: ID!
  }

  type Query {
    userTags(userId: ID!): [UserTag!]!
  }
`;

const tagSchema = makeExecutableSchema({
  typeDefs: tagTypeDefs,
  resolvers: {
    UserTag: {
      user: ({ userId }: { userId: string }) => ({ userId }),
    },
    Query: {
      userTags: (_, { userId }: { userId: string }) => tags.filter(t => t.userId === userId),
    },
  },
});

const userTypeDefs = gql`
  interface UserInterface {
    userId: ID!
    firstName: String!
  }

  type User implements UserInterface {
    userId: ID!
    firstName: String!
    lastName: String!
  }

  type Query {
    user(userId: ID!): User
  }
`;

const userSchema = makeExecutableSchema({
  typeDefs: userTypeDefs,
  resolvers: {
    Query: {
      user: (_, { userId }: { userId: string }) => users.find(u => u.userId === userId),
    },
  },
});

function createLocalExecutor(schema: GraphQLSchema): Executor<unknown> {
  return <TReturn, TArgs, TRoot, TExtensions>({
    rootValue,
    document,
    variables,
    context,
  }: ExecutionRequest<TArgs, unknown, TRoot, TExtensions>) => {
    console.log('DOCUMENT', print(document));
    return graphql(schema, print(document), rootValue, context, variables) as Promise<TReturn>;
  };
}

const stitchedSchema = stitchSchemas({
  subschemas: [
    {
      batch: true,
      executor: createLocalExecutor(userSchema),
      schema: buildASTSchema(userTypeDefs),
      merge: {
        User: {
          args: ({ userId }) => ({ userId }),
          fieldName: 'user',
          selectionSet: '{ userId }',
        },
      },
    },
    {
      executor: createLocalExecutor(tagSchema),
      schema: buildASTSchema(tagTypeDefs),
    },
  ],
});

const queryUser = /* GraphQL */ `
  fragment BadgeUser on User {
    userId
    firstName
  }

  query {
    userTags(userId: "u2") {
      user {
        ...BadgeUser
      }
    }
  }
`;

const queryUserInterface = /* GraphQL */ `
  fragment BadgeUser on UserInterface {
    userId
    firstName
  }

  query {
    userTags(userId: "u2") {
      user {
        ...BadgeUser
      }
    }
  }
`;

describe('Issue 3371', () => {
  describe('not bundled', () => {
    test('works with user fragment', async () => {
      const result = await graphql(stitchedSchema, queryUser);

      expect(result).toEqual({
        data: {
          userTags: [
            {
              user: { userId: 'u2', firstName: 'Two' },
            },
          ],
        },
      });
    });

    test('works with user interface fragment', async () => {
      const result = await graphql(stitchedSchema, queryUserInterface);

      expect(result).toEqual({
        data: {
          userTags: [
            {
              user: { userId: 'u2', firstName: 'Two' },
            },
          ],
        },
      });
    });
  });

  describe('bundled', () => {
    test('works with user fragment', async () => {
      const { graphqlServer } = require('./issue-3371-graphql-server');
      const result = await graphqlServer({
        body: JSON.stringify({ query: queryUser }),
        httpMethod: 'POST',
      });

      expect(JSON.parse(result.body)).toEqual({
        data: {
          userTags: [
            {
              user: { userId: 'u2', firstName: 'Two' },
            },
          ],
        },
      });
    });

    test('works with user interface fragment', async () => {
      const { graphqlServer } = require('./issue-3371-graphql-server');
      const result = await graphqlServer({
        body: JSON.stringify({ query: queryUserInterface }),
        httpMethod: 'POST',
      });

      expect(JSON.parse(result.body)).toEqual({
        data: {
          userTags: [
            {
              user: { userId: 'u2', firstName: 'Two' },
            },
          ],
        },
      });
    });
  });
});
