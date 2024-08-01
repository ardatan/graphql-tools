import { parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

test('works with mismatching array length', async () => {
  const booksWithTitle = [
    { id: '1', title: 'Book 1' },
    { id: '2', title: 'Book 2' },
    { id: '3', title: 'Book 3' },
    { id: '4', title: 'Book 4' },
  ];
  const booksWithIsbn = [
    { id: '2', isbn: 456 },
    { id: '4', isbn: 101 },
  ];
  const titleSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Book {
        id: ID!
        title: String
      }

      type Query {
        booksWithTitle(ids: [ID!]!): [Book]
      }
    `,
    resolvers: {
      Query: {
        booksWithTitle: (_obj, args, _ctx, info) => {
          return booksWithTitle.filter(book => args.ids.includes(book.id));
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
        booksWithIsbn(ids: [ID!]!): [Book]
      }
    `,
    resolvers: {
      Query: {
        booksWithIsbn: (_obj, args, _ctx) => {
          return booksWithIsbn.filter(book => args.ids.includes(book.id));
        },
      },
    },
  });

  const stitchedSchema = stitchSchemas({
    subschemas: [
      {
        schema: titleSchema,
        merge: {
          Book: {
            selectionSet: '{ id }',
            fieldName: 'booksWithTitle',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
            valuesFromResults: (results: any[], keys: readonly string[]) =>
              keys.map(key => results.find(result => result.id === key)),
          },
        },
      },
      {
        schema: isbnSchema,
        merge: {
          Book: {
            selectionSet: '{ id }',
            fieldName: 'booksWithIsbn',
            key: ({ id }) => id,
            argsFromKeys: ids => ({ ids }),
            valuesFromResults: (results: any[], keys: readonly string[]) =>
              keys.map(key => results.find(result => result.id === key)),
          },
        },
      },
    ],
    mergeTypes: true,
  });
  const result = await normalizedExecutor({
    schema: stitchedSchema,
    document: parse(/* GraphQL */ `
      query {
        booksWithTitle(ids: ["1", "2", "3", "4"]) {
          id
          title
          isbn
        }
      }
    `),
  });

  expect(result).toEqual({
    data: {
      booksWithTitle: [
        { id: '1', title: 'Book 1', isbn: null },
        { id: '2', title: 'Book 2', isbn: 456 },
        { id: '3', title: 'Book 3', isbn: null },
        { id: '4', title: 'Book 4', isbn: 101 },
      ],
    },
  });
});
