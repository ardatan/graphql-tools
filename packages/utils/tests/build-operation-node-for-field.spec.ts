import { print, parse, buildSchema, ASTNode } from 'graphql';

import { buildOperationNodeForField } from '../src/build-operation-for-field';

function clean(doc: string | ASTNode) {
  return print(typeof doc === 'string' ? parse(doc) : doc).trim();
}

const schema = buildSchema(/* GraphQL */ `
  type Pizza {
    dough: String!
    toppings: [String!]
  }

  type Book {
    id: ID!
    title: String!
  }

  type User {
    id: ID!
    name: String!
    favoritePizza: Pizza!
    favoriteBook: Book!
    favoriteFood: Food!
    shelf: [Book!]!
  }

  interface Salad {
    ingredients: [String!]!
  }

  type CeaserSalad implements Salad {
    ingredients: [String!]!
    additionalParmesan: Boolean!
  }

  type Coleslaw implements Salad {
    ingredients: [String!]!
    asian: Boolean!
  }

  union Food = Pizza | Salad

  type Post {
    comments(filter: String!): [String!]!
  }

  type Query {
    me: User
    user(id: ID!): User
    users: [User!]
    menu: [Food]
    menuByIngredients(ingredients: [String!]!): [Food]
    feed: [Post]
  }

  type Mutation {
    addSalad(ingredients: [String!]!): Salad
    addRandomFood: Food
  }

  type Subscription {
    onFood: Food
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`);

const models = ['User', 'Book'];

test('should work with Query', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'me',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query meQuery {
        me {
          id
          name
          favoritePizza {
            dough
            toppings
          }
          favoriteBook {
            id
          }
          favoriteFood {
            ... on Pizza {
              dough
              toppings
            }
            ... on Salad {
              ... on CeaserSalad {
                ingredients
                additionalParmesan
              }
              ... on Coleslaw {
                ingredients
                asian
              }
            }
          }
          shelf {
            id
          }
        }
      }
    `)
  );
});

test('should work with Query and variables', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'user',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query userQuery($id: ID!) {
        user(id: $id) {
          id
          name
          favoritePizza {
            dough
            toppings
          }
          favoriteBook {
            id
          }
          favoriteFood {
            ... on Pizza {
              dough
              toppings
            }
            ... on Salad {
              ... on CeaserSalad {
                ingredients
                additionalParmesan
              }
              ... on Coleslaw {
                ingredients
                asian
              }
            }
          }
          shelf {
            id
          }
        }
      }
    `)
  );
});

test('should work with Query and complicated variable', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'menuByIngredients',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query menuByIngredientsQuery($ingredients: [String!]!) {
        menuByIngredients(ingredients: $ingredients) {
          ... on Pizza {
            dough
            toppings
          }
          ... on Salad {
            ... on CeaserSalad {
              ingredients
              additionalParmesan
            }
            ... on Coleslaw {
              ingredients
              asian
            }
          }
        }
      }
    `)
  );
});

test('should work with Union', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'menu',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query menuQuery {
        menu {
          ... on Pizza {
            dough
            toppings
          }
          ... on Salad {
            ... on CeaserSalad {
              ingredients
              additionalParmesan
            }
            ... on Coleslaw {
              ingredients
              asian
            }
          }
        }
      }
    `)
  );
});

test('should work with mutation', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'mutation',
    field: 'addSalad',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      mutation addSaladMutation($ingredients: [String!]!) {
        addSalad(ingredients: $ingredients) {
          ... on CeaserSalad {
            ingredients
            additionalParmesan
          }
          ... on Coleslaw {
            ingredients
            asian
          }
        }
      }
    `)
  );
});

test('should work with mutation and unions', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'mutation',
    field: 'addRandomFood',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      mutation addRandomFoodMutation {
        addRandomFood {
          ... on Pizza {
            dough
            toppings
          }
          ... on Salad {
            ... on CeaserSalad {
              ingredients
              additionalParmesan
            }
            ... on Coleslaw {
              ingredients
              asian
            }
          }
        }
      }
    `)
  );
});

test('should work with Query and nested variables', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'feed',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query feedQuery($feedCommentsFilter: String!) {
        feed {
          comments(filter: $feedCommentsFilter)
        }
      }
    `)
  );
});

test('should be able to ignore using models when requested', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'user',
    models,
    ignore: ['User.favoriteBook', 'User.shelf'],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query userQuery($id: ID!) {
        user(id: $id) {
          id
          name
          favoritePizza {
            dough
            toppings
          }
          favoriteBook {
            id
            title
          }
          favoriteFood {
            ... on Pizza {
              dough
              toppings
            }
            ... on Salad {
              ... on CeaserSalad {
                ingredients
                additionalParmesan
              }
              ... on Coleslaw {
                ingredients
                asian
              }
            }
          }
          shelf {
            id
            title
          }
        }
      }
    `)
  );
});

test('should work with Subscription', async () => {
  const document = buildOperationNodeForField({
    schema,
    kind: 'subscription',
    field: 'onFood',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      subscription onFoodSubscription {
        onFood {
          ... on Pizza {
            dough
            toppings
          }
          ... on Salad {
            ... on CeaserSalad {
              ingredients
              additionalParmesan
            }
            ... on Coleslaw {
              ingredients
              asian
            }
          }
        }
      }
    `)
  );
});

test('should work with circular ref (default depth limit === 1)', async () => {
  const document = buildOperationNodeForField({
    schema: buildSchema(/* GraphQL */ `
      type A {
        b: B
      }

      type B {
        c: C
      }

      type C {
        end: String
        a: A
      }

      type Query {
        a: A
      }
    `),
    kind: 'query',
    field: 'a',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query aQuery {
        a {
          b {
            c {
              end
            }
          }
        }
      }
    `)
  );
});

test('should work with circular ref (custom depth limit)', async () => {
  const document = buildOperationNodeForField({
    schema: buildSchema(/* GraphQL */ `
      type A {
        b: B
      }

      type B {
        c: C
      }

      type C {
        end: String
        a: A
      }

      type Query {
        a: A
      }
    `),
    kind: 'query',
    field: 'a',
    models,
    ignore: [],
    circularReferenceDepth: 2,
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query aQuery {
        a {
          b {
            c {
              end
              a {
                b {
                  c {
                    end
                  }
                }
              }
            }
          }
        }
      }
    `)
  );
});

test('arguments', async () => {
  const document = buildOperationNodeForField({
    schema: buildSchema(/* GraphQL */ `
      input PageInfoInput {
        offset: Int!
        limit: Int!
      }

      type User {
        id: ID
        name: String
      }

      type Query {
        users(pageInfo: PageInfoInput!): [User]
      }
    `),
    kind: 'query',
    field: 'users',
    models,
    ignore: [],
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query usersQuery($pageInfo: PageInfoInput!) {
        users(pageInfo: $pageInfo) {
          id
          name
        }
      }
    `)
  );
});

test('selectedFields', async () => {

  const document = buildOperationNodeForField({
    schema,
    kind: 'query',
    field: 'user',
    selectedFields: {
      favoriteFood: {
        dough: true,
        toppings: true,
        asian: true,
      },
      shelf: true, // Add all nested fields
    }
  })!;

  expect(clean(document)).toEqual(
    clean(/* GraphQL */ `
      query userQuery($id: ID!) {
        user(id: $id) {
          favoriteFood {
            ... on Pizza {
              dough
              toppings
            }
            ... on Salad {
              ... on Coleslaw {
                asian
              }
            }
          }
          shelf {
            id
            title
          }
        }
      }
    `)
  );
})
