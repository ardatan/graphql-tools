// The below is meant to be an alternative canonical schema stitching example
// which relies on type merging.

import { graphql, OperationTypeNode } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { addMocksToSchema } from '@graphql-tools/mock';

import { delegateToSchema } from '@graphql-tools/delegate';

import { RenameRootFields, RenameTypes } from '@graphql-tools/wrap';
import { assertSome } from '@graphql-tools/utils';

import { stitchSchemas } from '../src/stitchSchemas.js';

describe('merging using type merging', () => {
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

    const stitchedSchema = stitchSchemas({
      subschemas: [
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
      ],
    });

    const query = /* GraphQL */ `
      query {
        userById(id: 5) {
          __typename
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
    `;

    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });

    expect(result.errors).toBeUndefined();
    assertSome(result.data);
    const userByIdData: any = result.data['userById'];
    expect(userByIdData.__typename).toBe('User');
    expect(userByIdData.chirps[1].id).not.toBe(null);
    expect(userByIdData.chirps[1].text).not.toBe(null);
    expect(userByIdData.chirps[1].author.email).not.toBe(null);
  });

  test('handle top level failures on subschema queries', async () => {
    let userSchema = makeExecutableSchema({
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

    userSchema = addMocksToSchema({ schema: userSchema });

    const failureSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          fail: Boolean
        }

        type Query {
          userById(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          userById: () => {
            throw new Error('failure message');
          },
        },
      },
    });

    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          schema: failureSchema,
          merge: {
            User: {
              fieldName: 'userById',
              selectionSet: '{ id }',
              args: originalResult => ({ id: originalResult.id }),
            },
          },
          batch: true,
        },
        {
          schema: userSchema,
          merge: {
            User: {
              fieldName: 'userById',
              selectionSet: '{ id }',
              args: originalResult => ({ id: originalResult.id }),
            },
          },
          batch: true,
        },
      ],
    });

    const query = /* GraphQL */ `
      query {
        userById(id: 5) {
          id
          email
          fail
        }
      }
    `;

    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });

    expect(result.errors).not.toBeUndefined();
    expect(result.data).toMatchObject({ userById: { fail: null } });
    expect(result.errors).toMatchObject([
      {
        message: 'failure message',
        path: ['userById', 'fail'],
      },
    ]);
  });

  test('merging types and type extensions should work together', async () => {
    const resultSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          resultById(id: ID!): String
        }
      `,
      resolvers: {
        Query: {
          resultById: () => 'ok',
        },
      },
    });

    const containerSchemaA = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Container {
          id: ID!
          resultId: ID!
        }

        type Query {
          containerById(id: ID!): Container
        }
      `,
      resolvers: {
        Query: {
          containerById: () => ({ id: 'Container', resultId: 'Result' }),
        },
      },
    });

    const containerSchemaB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Container {
          id: ID!
        }

        type Query {
          containerById(id: ID!): Container
          rootContainer: Container!
        }
      `,
      resolvers: {
        Query: {
          containerById: () => ({ id: 'Container' }),
          rootContainer: () => ({ id: 'Container' }),
        },
      },
    });

    const schema = stitchSchemas({
      subschemas: [
        {
          schema: resultSchema,
          batch: true,
        },
        {
          schema: containerSchemaA,
          merge: {
            Container: {
              fieldName: 'containerById',
              args: ({ id }) => ({ id }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
        {
          schema: containerSchemaB,
          merge: {
            Container: {
              fieldName: 'containerById',
              args: ({ id }) => ({ id }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
      ],
      typeDefs: /* GraphQL */ `
        extend type Container {
          result: String!
        }
      `,
      resolvers: {
        Container: {
          result: {
            selectionSet: `{ resultId }`,
            resolve(container, _args, context, info) {
              return delegateToSchema({
                schema: resultSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'resultById',
                args: {
                  id: container.resultId,
                },
                context,
                info,
              });
            },
          },
        },
      },
    });

    const result = await graphql({
      schema,
      source: /* GraphQL */ `
        query TestQuery {
          rootContainer {
            id
            result
          }
        }
      `,
    });

    const expectedResult = {
      data: {
        rootContainer: {
          id: 'Container',
          result: 'ok',
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});

describe('Merged associations', () => {
  const layoutSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Network {
        id: ID!
        domain: String!
      }
      type Post {
        id: ID!
        sections: [String]!
      }
      type Query {
        networks(ids: [ID!]!): [Network]!
        _posts(ids: [ID!]!): [Post]!
      }
    `,
    resolvers: {
      Query: {
        networks: (_root, { ids }) => ids.map((id: any) => ({ id, domain: `network${id}.com` })),
        _posts: (_root, { ids }) =>
          ids.map((id: any) => ({
            id,
            sections: ['News'],
          })),
      },
    },
  });

  const postsSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Network {
        id: ID!
      }
      type Post {
        id: ID!
        title: String!
        network: Network
      }
      type Query {
        posts(ids: [ID!]!): [Post]!
      }
    `,
    resolvers: {
      Query: {
        posts: (_root, { ids }) =>
          ids.map((id: any) => ({
            id,
            title: `Post ${id}`,
            network: { id: Number(id) + 2 },
          })),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: layoutSchema,
        merge: {
          Network: {
            selectionSet: '{ id }',
            fieldName: 'networks',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
          },
          Post: {
            selectionSet: '{ id }',
            fieldName: '_posts',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
          },
        },
      },
      {
        schema: postsSchema,
        merge: {
          Post: {
            selectionSet: '{ id }',
            fieldName: 'posts',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
          },
        },
      },
    ],
  });

  it('merges object with own remote type and association with associated remote type', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          posts(ids: [55]) {
            title
            network {
              domain
            }
            sections
          }
        }
      `,
    });
    assertSome(data);
    expect(data['posts']).toEqual([
      {
        title: 'Post 55',
        network: { domain: 'network57.com' },
        sections: ['News'],
      },
    ]);
  });
});

describe('merging using type merging when renaming', () => {
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

    const stitchedSchema = stitchSchemas({
      subschemas: [
        {
          schema: chirpSchema,
          transforms: [
            new RenameTypes(name => `Gateway_${name}`),
            new RenameRootFields((_operation, name) => `Chirp_${name}`),
          ],
          merge: {
            Gateway_User: {
              fieldName: 'Chirp_userById',
              args: originalResult => ({ id: originalResult.id }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
        {
          schema: authorSchema,
          transforms: [
            new RenameTypes(name => `Gateway_${name}`),
            new RenameRootFields((_operation, name) => `User_${name}`),
          ],
          merge: {
            Gateway_User: {
              fieldName: 'User_userById',
              args: originalResult => ({ id: originalResult.id }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
      ],
    });

    const query = /* GraphQL */ `
      query {
        User_userById(id: 5) {
          __typename
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
    `;

    const result = await graphql({
      schema: stitchedSchema,
      source: query,
    });

    expect(result.errors).toBeUndefined();
    assertSome(result.data);
    const userByIdData: any = result.data['User_userById'];
    expect(userByIdData.__typename).toBe('Gateway_User');
    expect(userByIdData.chirps[1].id).not.toBe(null);
    expect(userByIdData.chirps[1].text).not.toBe(null);
    expect(userByIdData.chirps[1].author.email).not.toBe(null);
  });
});

describe('external object annotation with batchDelegateToSchema', () => {
  const networkSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Domain {
        id: ID!
        name: String!
      }
      type Network {
        id: ID!
        domains: [Domain!]!
      }
      type Query {
        networks(ids: [ID!]!): [Network!]!
      }
    `,
    resolvers: {
      Query: {
        networks: (_root, { ids }) =>
          ids.map((id: unknown) => ({ id, domains: [{ id: Number(id) + 3, name: `network${id}.com` }] })),
      },
    },
  });

  const postsSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Network {
        id: ID!
      }
      type Post {
        id: ID!
        network: Network!
      }
      type Query {
        posts(ids: [ID!]!): [Post]!
      }
    `,
    resolvers: {
      Query: {
        posts: (_root, { ids }) =>
          ids.map((id: unknown) => ({
            id,
            network: { id: Number(id) + 2 },
          })),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: networkSchema,
        merge: {
          Network: {
            fieldName: 'networks',
            selectionSet: '{ id }',
            key: originalObject => originalObject.id,
            argsFromKeys: ids => ({ ids }),
          },
        },
      },
      {
        schema: postsSchema,
      },
    ],
  });

  test('if batchDelegateToSchema can delegate 2 times the same key', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          posts(ids: [55, 55]) {
            network {
              id
              domains {
                id
                name
              }
            }
          }
        }
      `,
    });
    assertSome(data);
    expect(data['posts']).toEqual([
      {
        network: { id: '57', domains: [{ id: '60', name: 'network57.com' }] },
      },
      {
        network: { id: '57', domains: [{ id: '60', name: 'network57.com' }] },
      },
    ]);
  });
});

describe('type merge repeated nested delegates', () => {
  const cities = [
    { name: 'Chicago', population: 2710000, country: { name: 'United States' } },
    { name: 'Marseille', population: 861000, country: { name: 'France' } },
    { name: 'Miami', population: 454279, country: { name: 'United States' } },
    { name: 'Paris', population: 2161000, country: { name: 'France' } },
  ];
  const citySchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Country {
        name: String!
      }

      type City {
        name: String!
        population: Float!
        country: Country!
      }

      type Query {
        citiesByName(name: [String]!): [City!]!
      }
    `,
    resolvers: {
      Query: {
        citiesByName: (_root, { name }) => name.map((n: string) => cities.find(c => c.name === n)),
      },
    },
  });

  const countries = [
    { name: 'United States', population: 328200000, continent: { name: 'North America' } },
    { name: 'France', population: 67060000, continent: { name: 'Europe' } },
  ];
  const countrySchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Continent {
        name: String!
      }

      type Country {
        name: String!
        population: Float!
        continent: Continent!
      }

      type Query {
        countriesByName(name: [String]!): [Country!]!
      }
    `,
    resolvers: {
      Query: {
        countriesByName: (_root, { name }) => name.map((n: string) => countries.find(c => c.name === n)),
      },
    },
  });

  const continents = [
    { name: 'North America', population: 579000000 },
    { name: 'Europe', population: 746400000 },
  ];
  const continentSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Continent {
        name: String!
        population: Float!
      }

      type Query {
        continentsByName(name: [String]!): [Continent!]!
      }
    `,
    resolvers: {
      Query: {
        continentsByName: (_root, { name }) => name.map((n: string) => continents.find(c => c.name === n)),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: citySchema,
        batch: true,
      },
      {
        schema: countrySchema,
        batch: true,
        merge: {
          Country: {
            fieldName: 'countriesByName',
            selectionSet: '{ name }',
            key: ({ name }) => name,
            argsFromKeys: name => ({ name }),
          },
        },
      },
      {
        schema: continentSchema,
        batch: true,
        merge: {
          Continent: {
            fieldName: 'continentsByName',
            selectionSet: '{ name }',
            key: ({ name }) => name,
            argsFromKeys: name => ({ name }),
          },
        },
      },
    ],
  });

  test('completes merge for all children', async () => {
    const { data } = await graphql({
      schema: gatewaySchema,
      source: /* GraphQL */ `
        query {
          citiesByName(name: ["Chicago", "Miami", "Paris", "Marseille"]) {
            name
            population
            country {
              name
              population
              continent {
                name
                population
              }
            }
          }
        }
      `,
    });
    assertSome(data);
    expect(data['citiesByName']).toEqual([
      {
        name: 'Chicago',
        population: 2710000,
        country: {
          name: 'United States',
          population: 328200000,
          continent: {
            name: 'North America',
            population: 579000000,
          },
        },
      },
      {
        name: 'Miami',
        population: 454279,
        country: {
          name: 'United States',
          population: 328200000,
          continent: {
            name: 'North America',
            population: 579000000,
          },
        },
      },
      {
        name: 'Paris',
        population: 2161000,
        country: {
          name: 'France',
          population: 67060000,
          continent: {
            name: 'Europe',
            population: 746400000,
          },
        },
      },
      {
        name: 'Marseille',
        population: 861000,
        country: {
          name: 'France',
          population: 67060000,
          continent: {
            name: 'Europe',
            population: 746400000,
          },
        },
      },
    ]);
  });
});
