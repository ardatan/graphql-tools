import { buildSchema, graphql } from 'graphql';
import { addMocksToSchema, assertIsRef, createMockStore } from '../src';

const typeDefs = `
type User {
  id: ID!
  age: Int!
  name: String!
  image: UserImage!
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
}

type Mutation {
  changeViewerName(newName: String!): User!
}
`;

const schema = buildSchema(typeDefs);

describe('addMocksToSchema', () => {
  it('basic', async () => {
    const query = `
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
    expect(typeof data!['viewer']['id']).toBe('string')
    expect(typeof data!['viewer']['name']).toBe('string')
    expect(typeof data!['viewer']['age']).toBe('number');

    const { data: data2 } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(data2!['viewer']['id']).toEqual(data!['viewer']['id']);
  });

  it('mutations resolver', async () => {
    const store = createMockStore({ schema });
    const mockedSchema = addMocksToSchema({ schema, store, resolvers: {
      Mutation: {
        changeViewerName: (_, { newName }: { newName: string} ) => {
          const viewer = store.get('Query', 'ROOT', 'viewer');
          assertIsRef(viewer);

          store.set('User', viewer.$ref.key, 'name', newName);
          return store.get('Query', 'ROOT', 'viewer');
        }
      }
    }});

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

    expect(data3!['viewer']['name']).toEqual('Alexandre');
    expect(data3!['viewer']['name']).toEqual('Alexandre');
  });

  it('should handle arguments', async () => {
    const query = `
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
    expect(data!['user1']['id']).not.toEqual(data!['user2']['id']);
  });

  it('should handle union type', async () => {
    const query = `
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
    expect(data!['viewer']['image']['__typename']).toBeDefined();
  });

  it('should handle interface type', async () => {
    const query = `
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
    expect(data!['viewer']['book']['__typename']).toBeDefined();
  });
  it('should handle custom scalars', async () => {

    const mockDate = new Date().toJSON().split('T')[0];

    const query = `
      query {
        viewer {
          book {
            title
            publishedAt
          }
        }
      }
    `;

    const mockedSchema = addMocksToSchema({ schema, mocks: {
      Date: () => mockDate
    }});
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });


    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    expect(data!['viewer']['book']['publishedAt']).toBe(mockDate);

  })
});
