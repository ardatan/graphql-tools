import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { stitchSchemas } from '../src/stitchSchemas';

describe('Directives', () => {
  it('adds resolveTo directive to delegated root fields', async () => {
    const users = [
      {
        id: '0',
        name: 'Ada Lovelace',
      },
      {
        id: '1',
        name: 'Alan Turing',
      },
    ];
    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          name: 'Users',
          schema: makeExecutableSchema({
            typeDefs: /* GraphQL */ `
              type Query {
                users(ids: [ID!]!): [User!]!
                user(id: ID!): User!
              }

              type Mutation {
                addUser(user: UserInput!): User!
              }

              input UserInput {
                name: String!
              }

              interface Node {
                id: ID!
              }

              type User implements Node {
                id: ID!
                name: String!
              }
            `,
            resolvers: {
              Query: {
                users: (_, { ids }) => users.filter(user => ids.includes(user.id)),
                user: (_, { id }) => users.find(user => user.id === id),
              },
            },
          }),
        },
        {
          name: 'Posts',
          schema: makeExecutableSchema({
            typeDefs: /* GraphQL */ `
              type Query {
                posts(ids: [ID!]!): [Post!]!
                post(id: ID!): Post!
              }

              type Mutation {
                addPost(post: PostInput!): Post!
              }

              input PostInput {
                title: String!
                authorId: ID!
              }

              interface Node {
                id: ID!
              }

              type Post implements Node {
                id: ID!
                title: String!
                authorId: ID!
              }
            `,
            resolvers: {
              Query: {
                posts: () => [
                  {
                    id: '0',
                    title: 'Hello World',
                    authorId: '0',
                  },
                  {
                    id: '1',
                    title: 'Foo Bar',
                    authorId: '1',
                  },
                ],
              },
            },
          }),
        },
      ],
    });
    expect(printSchemaWithDirectives(stitchedSchema)).toMatchSnapshot('schema-with-directives');
  });
});
