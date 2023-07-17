import { parse } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { addMocksToSchema } from '@graphql-tools/mock';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createStitchingExecutor } from '../src/executor';
import { stitchSchemas } from '../src/stitchSchemas';

describe('gateway', () => {
  test('works', async () => {
    let chirpSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Chirp {
          id: ID!
          text: String
          author: User
          coAuthors: [User]
          authorGroups: [[User]]
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
      typeDefs: /* GraphQL */ `
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

    const subschemas: SubschemaConfig[] = [
      {
        schema: chirpSchema,
        merge: {
          User: {
            fieldName: 'userById',
            args: originalResult => ({ id: originalResult.id }),
            selectionSet: '{ id }',
          },
        },
        batch: true,
      },
      {
        schema: authorSchema,
        merge: {
          User: {
            fieldName: 'userById',
            args: originalResult => ({ id: originalResult.id }),
            selectionSet: '{ id }',
          },
        },
        batch: true,
      },
    ];

    const document = parse(/* GraphQL */ `
      query test($id: ID!) {
        userById(id: $id) {
          __typename
          id
          email
          chirps {
            id
            textAlias: text
            author {
              email
            }
            coAuthors {
              email
            }
            authorGroups {
              email
            }
          }
        }
      }
    `);

    const stitchedSchema = stitchSchemas({
      subschemas,
    });

    const helloExec = createStitchingExecutor(stitchedSchema);

    const result = await helloExec({
      document,
      variables: {
        id: 5,
      },
    });

    const userByIdData = result.data['userById'];
    expect(userByIdData.__typename).toBe('User');
    expect(userByIdData.chirps[1].id).not.toBe(null);
    expect(userByIdData.chirps[1].text).not.toBe(null);
    expect(userByIdData.chirps[1].author.email).not.toBe(null);
  });
});
