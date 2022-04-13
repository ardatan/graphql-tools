import { graphql } from 'graphql';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { stitchSchemas } from '../src/stitchSchemas';

const articles = [
  {
    title: {
      type: 'TitleOne',
      text: 'hello world',
    },
  },
  {
    title: {
      type: 'TitleTwo',
      text: 1,
    },
  },
  {
    title: {
      type: 'TitleTwo',
      text: 2,
    },
  },
  {
    title: {
      type: 'TitleOne',
      text: 'bye',
    },
  },
];

const titleSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    union Title = TitleOne | TitleTwo

    type TitleOne {
      text: String
    }

    type TitleTwo {
      text: Int
    }

    type Article {
      title: Title
    }

    type Query {
      articles: [Article!]
    }
  `,
  resolvers: {
    Query: {
      articles: () => articles,
    },
    Title: {
      __resolveType: (title: any) => title.type,
    },
  },
});

const greetingSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      greeting: String
    }
  `,
  resolvers: {
    Query: {
      greeting: () => 'Hello!',
    },
  },
});

const stitchedSchema = stitchSchemas({
  subschemas: [titleSchema, greetingSchema],
});

describe('stitchSchemas union support', () => {
  test('to work', async () => {
    const result = await graphql({
      schema: stitchedSchema,
      source: /* GraphQL */ `
        query {
          articles {
            title {
              ... on TitleOne {
                title1: text
              }
              ... on TitleTwo {
                title2: text
              }
            }
          }
        }
      `,
    });

    expect(result).toEqual({
      data: {
        articles: [
          {
            title: {
              title1: 'hello world',
            },
          },
          {
            title: {
              title2: 1,
            },
          },
          {
            title: {
              title2: 2,
            },
          },
          {
            title: {
              title1: 'bye',
            },
          },
        ],
      },
    });
  });
});
