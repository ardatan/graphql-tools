import { parse } from 'graphql';
import { execute, isIncrementalResult } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

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
          logSelectionsMade(info.fieldNodes, 'titleSchema');
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
          logSelectionsMade(info.fieldNodes, 'isbnSchema');
          return [{ id: '1', isbn: 123 }];
        },
      },
    },
  });

  const selectionsMade = {
    titleSchema: [],
    isbnSchema: [],
  };

  const logSelectionsMade = (fieldNodes: any, schema: string) => {
    if (!fieldNodes) return;
    fieldNodes.forEach((node: any) => {
      node.selectionSet.selections.forEach((selection: any) => {
        selectionsMade[schema].push(selection.name.value);
      });
    });
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
    selectionsMade.titleSchema = [];
    selectionsMade.isbnSchema = [];

    await execute({
      schema: stitchedSchemaWithValuesFromResults,
      document: parse(query),
    });

    console.log(selectionsMade);
    expect(selectionsMade).toEqual({
      titleSchema: ['id', 'title', '__typename'],
      isbnSchema: ['id', 'isbn', '__typename'],
    });
  });
});
