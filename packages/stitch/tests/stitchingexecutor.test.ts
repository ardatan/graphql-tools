import { SubschemaConfig } from '@graphql-tools/delegate';
import { addMocksToSchema } from '@graphql-tools/mock';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';
import { createStitchingExecutor } from '../src/executor';

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

    const helloExec = createStitchingExecutor({
      subschemas,
    });

    const result = await helloExec({
      document,
      variables: {
        id: 5,
      },
    });

    console.log('result', result);
    /*
    const userByIdData = await delegateToSchema({
      schema: subschemas[0],
      info: {
        schema: stitchedSchema,
        fieldNodes: [
          {
            kind: Kind.FIELD,
            selectionSet,
            name: {
              kind: Kind.NAME,
              value: 'userById'
            },
            arguments: [
              {
                kind: Kind.ARGUMENT,
                name: {
                  kind: Kind.NAME,
                  value: 'id'
                },
                value: {
                  kind: Kind.INT,
                  value: '5'
                }
              }
            ]
          }
        ],
        returnType: stitchedSchema.getType('User') as any,
        fieldName: 'userById',
        operation: document.definitions[0] as any,
        parentType: stitchedSchema.getQueryType() as any,
      }
    })
*/
    const userByIdData = result.data['userById'];
    expect(userByIdData.__typename).toBe('User');
    expect(userByIdData.chirps[1].id).not.toBe(null);
    expect(userByIdData.chirps[1].text).not.toBe(null);
    expect(userByIdData.chirps[1].author.email).not.toBe(null);
  });
});
