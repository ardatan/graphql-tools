import { buildSchema, graphql } from 'graphql';
import { addMocksToSchema, assertIsRef, createMockStore, isRef } from '../src/index.js';

const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    age: Int!
    name: String!
    image: UserImage!
    book: Book!
  }

  type Author {
    _id: ID!
    name: String!
    book: Book!
  }

  union UserImage = UserImageSolidColor | UserImageURL

  type UserImageSolidColor {
    color: String!
  }

  type UserImageURL {
    url: String!
  }

  scalar Date

  interface Book {
    id: ID!
    title: String
    publishedAt: Date
  }

  type TextBook implements Book {
    id: ID!
    title: String
    publishedAt: Date
    text: String
  }

  type ColoringBook implements Book {
    id: ID!
    title: String
    publishedAt: Date
    colors: [String]
  }

  type Query {
    viewer: User!
    userById(id: ID!): User!
    author: Author!
  }

  type Mutation {
    changeViewerName(newName: String!): User!
  }
`;

const schema = buildSchema(typeDefs);

describe('addMocksToSchema', () => {
  it('basic', async () => {
    const query = /* GraphQL */ `
      query {
        viewer {
          id
          name
          age
        }
      }
    `;
    const mockedSchema = addMocksToSchema({ schema });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    const viewerData = data?.['viewer'] as any;
    expect(typeof viewerData['id']).toBe('string');
    expect(typeof viewerData['name']).toBe('string');
    expect(typeof viewerData['age']).toBe('number');

    const { data: data2 } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    const viewerData2 = data2?.['viewer'] as any;

    expect(viewerData2['id']).toEqual(viewerData['id']);
  });

  it('handle _id key field', async () => {
    const query = /* GraphQL */ `
      query {
        author {
          _id
          name
        }
      }
    `;
    const mockedSchema = addMocksToSchema({ schema });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    const viewerData = data?.['author'] as any;
    expect(typeof viewerData['_id']).toBe('string');
    expect(typeof viewerData['name']).toBe('string');

    const { data: data2 } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    const viewerData2 = data2?.['author'] as any;

    expect(viewerData2['_id']).toEqual(viewerData['_id']);
  });

  it('mutations resolver', async () => {
    const store = createMockStore({ schema });
    const mockedSchema = addMocksToSchema({
      schema,
      store,
      resolvers: {
        Mutation: {
          changeViewerName: (_: any, { newName }: { newName: string }) => {
            const viewer = store.get('Query', 'ROOT', 'viewer');
            assertIsRef(viewer);

            store.set('User', viewer.$ref.key, 'name', newName);
            return store.get('Query', 'ROOT', 'viewer');
          },
        },
      },
    });

    await graphql({
      schema: mockedSchema,
      source: `query { viewer { name }}`,
    });

    await graphql({
      schema: mockedSchema,
      source: `mutation { changeViewerName(newName: "Alexandre") { name } }`,
    });

    const { data: data3 } = await graphql({
      schema: mockedSchema,
      source: `query { viewer { name }}`,
    });

    const viewerData3 = data3?.['viewer'] as any;
    expect(viewerData3['name']).toEqual('Alexandre');
    expect(viewerData3['name']).toEqual('Alexandre');
  });

  it('should handle arguments', async () => {
    const query = /* GraphQL */ `
      query {
        user1: userById(id: "1") {
          id
          name
        }
        user2: userById(id: "2") {
          id
          name
        }
      }
    `;
    const store = createMockStore({ schema });

    const mockedSchema = addMocksToSchema({ schema, store });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    const user1Data = data?.['user1'] as any;
    const user2Data = data?.['user2'] as any;
    expect(user1Data['id']).not.toEqual(user2Data['id']);
  });

  it('should handle union type', async () => {
    const query = /* GraphQL */ `
      query {
        viewer {
          image {
            __typename
            ... on UserImageURL {
              url
            }
            ... on UserImageSolidColor {
              color
            }
          }
        }
      }
    `;
    const store = createMockStore({ schema });

    const mockedSchema = addMocksToSchema({ schema, store });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    expect((data!['viewer'] as any)['image']['__typename']).toBeDefined();
  });

  it('should handle interface type', async () => {
    const query = /* GraphQL */ `
      query {
        viewer {
          book {
            title
            __typename
            ... on TextBook {
              text
            }
            ... on ColoringBook {
              colors
            }
          }
        }
      }
    `;
    const store = createMockStore({ schema });

    const mockedSchema = addMocksToSchema({ schema, store });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    expect((data!['viewer'] as any)['book']['__typename']).toBeDefined();
  });
  it('should handle custom scalars', async () => {
    const mockDate = new Date().toJSON().split('T')[0];

    const query = /* GraphQL */ `
      query {
        viewer {
          book {
            title
            publishedAt
          }
        }
      }
    `;

    const mockedSchema = addMocksToSchema({
      schema,
      mocks: {
        Date: () => mockDate,
      },
    });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    expect((data!['viewer'] as any)['book']['publishedAt']).toBe(mockDate);
  });
  it('should handle null fields correctly', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: Foo
      }
      type Foo {
        field1: String
        field2: Int
      }
    `);
    const mockedSchema = addMocksToSchema({
      schema,
      mocks: {
        Foo: () => ({
          field1: 'text',
          field2: null,
        }),
      },
    });
    const query = /* GraphQL */ `
      {
        foo {
          field1
          field2
        }
      }
    `;
    const { data } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    const fooData = data?.['foo'] as any;
    expect(fooData.field1).toBe('text');
    expect(fooData.field2).toBe(null);
  });
  it('should handle null fields correctly in nested fields', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: Foo
      }
      type Foo {
        foo_field: String
        boo: Boo
      }
      type Boo {
        boo_field: String
      }
    `);
    const mockedSchema = addMocksToSchema({
      schema,
      mocks: {
        Foo: () => ({
          foo_field: 'text',
          boo: null,
        }),
      },
    });
    const query = /* GraphQL */ `
      {
        foo {
          foo_field
          boo {
            boo_field
          }
        }
      }
    `;
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(errors).toBeFalsy();

    const fooData = data?.['foo'] as any;
    expect(fooData.foo_field).toBe('text');
    expect(fooData.boo).toBe(null);
  });
  it('handle objects without object prototype correctly', () => {
    const maybeRef = Object.create(null);
    maybeRef.$ref = {};
    expect(isRef(maybeRef)).toBeTruthy();
  });
  it('resolves fields without defaultResolvedValue correctly', async () => {
    const store = createMockStore({
      schema,
      mocks: {
        String: () => 'custom mock for String',
      },
    });
    const mockedSchema = addMocksToSchema({
      schema,
      store,
      resolvers: {
        Query: {
          viewer: () => ({}),
        },
      },
    });

    const { data } = await graphql({
      schema: mockedSchema,
      source: `query { viewer { name }}`,
    });
    const viewer = data?.['viewer'] as any;

    expect(viewer.name).toEqual('custom mock for String');
  });
});
