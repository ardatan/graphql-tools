import { parse, print } from 'graphql';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import '../../testing/to-be-similar-gql-doc';

describe('batch delegation', () => {
  const titleSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Book {
        id: ID!
        title: String
      }

      type Query {
        book(id: ID!): Book
      }
    `,
    resolvers: {
      Query: {
        book: (_obj, _args, _ctx, info) => {
          logSelectionsMade(info, 'titleSchema');
          return { id: '1', title: 'Book 1' };
        },
      },
    },
  });

  const isbnSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Book {
        id: ID!
        isbn: Int
      }

      type Query {
        books(id: [ID!]!): [Book]
      }
    `,
    resolvers: {
      Query: {
        books: (_obj, _args, _ctx, info) => {
          logSelectionsMade(info, 'isbnSchema');
          return [{ id: '1', isbn: 123 }];
        },
      },
    },
  });

  const queriesMade = {
    titleSchema: [],
    isbnSchema: [],
  };

  const logSelectionsMade = (info: any, schema: string) => {
    queriesMade[schema].push(print(info.operation));
  };

  const stitchedSchemaWithValuesFromResults = stitchSchemas({
    subschemas: [
      {
        schema: titleSchema,
        merge: {
          Book: {
            selectionSet: '{ id }',
            fieldName: 'book',
          },
        },
      },
      {
        schema: isbnSchema,
        merge: {
          Book: {
            selectionSet: '{ id }',
            fieldName: 'books',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ id: ids }),
            valuesFromResults: ({ results }, keys) => {
              const response = Object.fromEntries(results.map((r: any) => [r.id, r]));

              return keys.map(key => response[key] ?? { id: key });
            },
          },
        },
      },
    ],
    mergeTypes: true,
  });

  const stitchedSchemaWithoutValuesFromResults = stitchSchemas({
    subschemas: [
      {
        schema: titleSchema,
        merge: {
          Book: {
            selectionSet: '{ id }',
            fieldName: 'book',
          },
        },
      },
      {
        schema: isbnSchema,
        merge: {
          Book: {
            selectionSet: '{ id }',
            fieldName: 'books',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ id: ids }),
          },
        },
      },
    ],
    mergeTypes: true,
  });

  const query = /* GraphQL */ `
    query {
      book(id: "1") {
        id
        title
        isbn
      }
    }
  `;

  test('works with merged types and array batching', async () => {
    const goodResult = await execute({
      schema: stitchedSchemaWithoutValuesFromResults,
      document: parse(query),
    });

    if (isIncrementalResult(goodResult)) throw Error('result is incremental');

    expect(goodResult.data).toEqual({
      book: {
        id: '1',
        title: 'Book 1',
        isbn: 123,
      },
    });
  });

  test('does not work with valuesFromResults', async () => {
    const badResult = await execute({
      schema: stitchedSchemaWithValuesFromResults,
      document: parse(query),
    });

    if (isIncrementalResult(badResult)) throw Error('result is incremental');

    expect(badResult.data).toEqual({
      book: {
        id: '1',
        title: 'Book 1',
        isbn: 123,
      },
    });
  });

  test('it makes the right selections', async () => {
    queriesMade.titleSchema = [];
    queriesMade.isbnSchema = [];

    await execute({
      schema: stitchedSchemaWithValuesFromResults,
      document: parse(query),
    });

    const expectedTitleQuery = /* GraphQL */ `
      query {
        __typename
        book(id: "1") {
          id
          title
          __typename
        }
      }
    `;
    const expectedIsbnQuery = /* GraphQL */ `
      query ($_v0_id: [ID!]!) {
        books(id: $_v0_id) {
          id
          isbn
        }
      }
    `;

    expect(queriesMade.isbnSchema[0]).toBeSimilarGqlDoc(expectedIsbnQuery);
    expect(queriesMade.titleSchema[0]).toBeSimilarGqlDoc(expectedTitleQuery);
  });
});
