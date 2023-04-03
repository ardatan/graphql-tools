import { createYoga, createSchema } from 'graphql-yoga';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { GraphQLSchema, parse } from 'graphql';
import { createStitchingDirectivesHTTPGateway } from '@graphql-tools/stitching-directives-http';
import { normalizedExecutor } from '@graphql-tools/executor';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('stitching-directives-http', () => {
  const { stitchingDirectivesTypeDefs } = stitchingDirectives();

  const books = [
    {
      id: '1',
      title: 'Harry Potter and the Chamber of Secrets',
    },
    {
      id: '2',
      title: 'Jurassic Park',
    },
    {
      id: '3',
      title: 'The Hobbit',
    },
  ];

  const authors = [
    {
      id: '1',
      name: 'J.K. Rowling',
    },
    {
      id: '2',
      name: 'Michael Crichton',
    },
    {
      id: '3',
      name: 'J.R.R. Tolkien',
    },
  ];

  const booksWithAuthors = [
    {
      id: '1',
      author: {
        id: '1',
      },
    },
    {
      id: '2',
      author: {
        id: '2',
      },
    },
    {
      id: '3',
      author: {
        id: '3',
      },
    },
  ];

  const bookSchema = createSchema({
    typeDefs: /* GraphQL */ `
      ${stitchingDirectivesTypeDefs}
      type Query {
        book(id: ID!): Book! @merge(keyField: "id") @canonical
      }
      type Book {
        id: ID!
        title: String!
      }
    `,
    resolvers: {
      Query: {
        book: (parent, args) => books.find(book => book.id === args.id),
      },
    },
  });

  const authorSchema = createSchema({
    typeDefs: /* GraphQL */ `
      ${stitchingDirectivesTypeDefs}
      type Query {
        author(id: ID!): Author! @merge(keyField: "id") @canonical
      }
      type Author {
        id: ID!
        name: String!
      }
    `,
    resolvers: {
      Query: {
        author: (parent, args) => authors.find(author => author.id === args.id),
      },
    },
  });

  const bookWithAuthor = createSchema({
    typeDefs: /* GraphQL */ `
      ${stitchingDirectivesTypeDefs}
      type Query {
        book(id: ID!): Book! @merge(keyField: "id")
      }
      type Book {
        id: ID!
        author: Author!
      }
      type Author {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        book: (parent, args) => booksWithAuthors.find(bookWithAuthor => bookWithAuthor.id === args.id),
      },
    },
  });

  const bookServer = createYoga({
    schema: bookSchema,
  });

  const authorServer = createYoga({
    schema: authorSchema,
  });

  const bookWithAuthorServer = createYoga({
    schema: bookWithAuthor,
  });

  let gateway: GraphQLSchema;
  beforeAll(async () => {
    gateway = await createStitchingDirectivesHTTPGateway([
      {
        url: 'http://localhost:4001/graphql',
        sdl: printSchemaWithDirectives(bookSchema),
        fetch: bookServer.fetch,
      },
      {
        url: 'http://localhost:4002/graphql',
        sdl: printSchemaWithDirectives(authorSchema),
        fetch: authorServer.fetch,
      },
      {
        url: 'http://localhost:4003/graphql',
        sdl: printSchemaWithDirectives(bookWithAuthor),
        fetch: bookWithAuthorServer.fetch,
      },
    ]);
  });
  it('should work', async () => {
    const result = await normalizedExecutor({
      schema: gateway,
      document: parse(/* GraphQL */ `
        query {
          book(id: "1") {
            id
            title
            author {
              id
              name
            }
          }
        }
      `),
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "book": {
            "author": {
              "id": "1",
              "name": "J.K. Rowling",
            },
            "id": "1",
            "title": "Harry Potter and the Chamber of Secrets",
          },
        },
      }
    `);
  });
});
