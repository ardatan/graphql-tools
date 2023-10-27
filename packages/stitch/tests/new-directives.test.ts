import { parse } from 'graphql';
import { createDefaultExecutor, SubschemaConfig } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createStichedSchemaFromSdl } from '../src/createStitchedSchemaFromSdl';
import { stitchSchemas } from '../src/stitchSchemas';

describe('New Directives', () => {
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
  const subschemas: SubschemaConfig[] = [
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
            users: (_, { ids }: { ids: string[] }) =>
              ids.map(id => users.find(user => user.id === id)),
            user: (_, { id }) => users.find(user => user.id === id),
          },
        },
      }),
      merge: {
        User: {
          fieldName: 'users',
          selectionSet: '{ id }',
          key: ({ id }) => id,
          argsFromKeys: ids => ({ ids }),
        },
      },
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
            author: User!
          }

          type User implements Node {
            id: ID!
          }
        `,
        resolvers: {
          Query: {
            posts: () => [
              {
                id: '0',
                title: 'Hello World',
                author: {
                  id: '0',
                },
              },
              {
                id: '1',
                title: 'Foo Bar',
                author: {
                  id: '1',
                },
              },
            ],
          },
        },
      }),
    },
  ];
  const stitchedSchema = stitchSchemas({
    subschemas,
  });

  const stitchedSdl = printSchemaWithDirectives(stitchedSchema);

  it('adds directives to the output', async () => {
    expect(stitchedSdl).toMatchSnapshot('schema-with-directives');
  });
  const stitchedFromSDL = createStichedSchemaFromSdl(
    stitchedSdl,
    new Map(
      subschemas.map(subschema => [subschema.name!, createDefaultExecutor(subschema.schema)]),
    ),
  );
  it('consumes the SDL, and create an executable schema which is identical to the original as an SDL', async () => {
    expect(printSchemaWithDirectives(stitchedFromSDL)).toEqual(stitchedSdl);
  });
  it('consumes the SDL, and create an executable schema which is identical to the original as an executable schema', async () => {
    const query = parse(/* GraphQL */ `
      query Posts {
        posts(ids: ["0", "1"]) {
          id
          title
          author {
            id
            name
          }
        }
      }
    `);
    const expectedResult = await normalizedExecutor({
      document: query,
      schema: stitchedSchema,
    });
    const givenResult = await normalizedExecutor({
      document: query,
      schema: stitchedFromSDL,
    });
    expect(givenResult).toEqual(expectedResult);
  });
});
