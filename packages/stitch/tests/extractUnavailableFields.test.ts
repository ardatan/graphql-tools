import { getOperationAST, isObjectType, Kind, parse, print, SelectionSetNode } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stripWhitespaces } from '../../merge/tests/utils';
import { extractUnavailableFields } from '../src/getFieldsNotInSubschema';
import { stitchSchemas } from '../src/stitchSchemas';

describe('extractUnavailableFields', () => {
  it('should extract correct fields', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User
        }
        type User {
          id: ID!
          name: String!
        }
      `,
    });
    const userQuery = /* GraphQL */ `
      query {
        user {
          id
          name
          email
          friends {
            id
            name
            email
          }
        }
      }
    `;
    const userQueryDoc = parse(userQuery, { noLocation: true });
    const operationAst = getOperationAST(userQueryDoc, null);
    if (!operationAst) {
      throw new Error('Operation AST not found');
    }
    const selectionSet = operationAst.selectionSet;
    const userSelection = selectionSet.selections[0];
    if (userSelection.kind !== 'Field') {
      throw new Error('User selection not found');
    }
    const queryType = schema.getType('Query');
    if (!isObjectType(queryType)) {
      throw new Error('Query type not found');
    }
    const userField = queryType.getFields()['user'];
    if (!userField) {
      throw new Error('User field not found');
    }
    const unavailableFields = extractUnavailableFields(userField, userSelection, () => true);
    const extractedSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: unavailableFields,
    };
    expect(stripWhitespaces(print(extractedSelectionSet))).toBe(
      `{ email friends { id name email } }`,
    );
  });
  it('excludes __typename', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User
        }
        type User {
          id: ID!
          name: String!
          friends: [User]
        }
      `,
    });
    const userQuery = /* GraphQL */ `
      query {
        user {
          __typename
          id
          name
          friends {
            __typename
            id
            name
            description
          }
        }
      }
    `;
    const userQueryDoc = parse(userQuery, { noLocation: true });
    const operationAst = getOperationAST(userQueryDoc, null);
    if (!operationAst) {
      throw new Error('Operation AST not found');
    }
    const selectionSet = operationAst.selectionSet;
    const userSelection = selectionSet.selections[0];
    if (userSelection.kind !== 'Field') {
      throw new Error('User selection not found');
    }
    const queryType = schema.getType('Query');
    if (!isObjectType(queryType)) {
      throw new Error('Query type not found');
    }
    const userField = queryType.getFields()['user'];
    if (!userField) {
      throw new Error('User field not found');
    }
    const unavailableFields = extractUnavailableFields(userField, userSelection, () => true);
    const extractedSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: unavailableFields,
    };
    expect(stripWhitespaces(print(extractedSelectionSet))).toBe('{ friends { description } }');
  });
  it('picks the subfields only when available to resolve', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          post: Post
        }
        type Post {
          id: ID!
        }
      `,
    });
    const fieldNodesByField = {
      Post: {
        id: [],
        name: [],
      },
      Category: {
        id: [],
        // details: undefined, // This field is not available to resolve
      },
    };
    const postQuery = /* GraphQL */ `
      query {
        post {
          id
          name
          category {
            id
            details
          }
        }
      }
    `;
    const postQueryDoc = parse(postQuery, { noLocation: true });
    const operationAst = getOperationAST(postQueryDoc, null);
    if (!operationAst) {
      throw new Error('Operation AST not found');
    }
    const selectionSet = operationAst.selectionSet;
    const postSelection = selectionSet.selections[0];
    if (postSelection.kind !== 'Field') {
      throw new Error('Post selection not found');
    }
    const queryType = schema.getType('Query');
    if (!isObjectType(queryType)) {
      throw new Error('Query type not found');
    }
    const postField = queryType.getFields()['post'];
    if (!postField) {
      throw new Error('Post field not found');
    }
    const unavailableFields = extractUnavailableFields(
      postField,
      postSelection,
      (fieldType, selection) => !fieldNodesByField?.[fieldType.name]?.[selection.name.value],
    );
    const extractedSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: unavailableFields,
    };
    expect(stripWhitespaces(print(extractedSelectionSet))).toBe('{ category { id details } }');
  });
});

it('should work', async () => {
  const A = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        productFromA(id: ID): Product
        # No category resolver is present
      }

      type Product {
        id: ID
        category: Category
      }

      type Category {
        details: String
      }
    `,
    resolvers: {
      Query: {
        productFromA: (_, { id }) => ({
          id,
          category: { details: `Details for Product#${id}` },
        }),
      },
    },
  });

  const B = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        productFromB(id: ID): Product
      }
      type Product {
        id: ID
        category: Category
      }
      type Category {
        id: ID
      }
    `,
    resolvers: {
      Query: {
        productFromB: (_, { id }) => ({
          id,
          category: {
            id: 3,
          },
        }),
      },
    },
  });
  const C = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        categoryFromC(id: ID): Category
      }

      type Category {
        id: ID
        name: String
      }
    `,
    resolvers: {
      Query: {
        categoryFromC: (_, { id }) => ({
          id,
          name: `Category#${id}`,
        }),
      },
    },
  });
  const D = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        productFromD(id: ID): Product
      }
      type Product {
        id: ID
        name: String
      }
    `,
    resolvers: {
      Query: {
        productFromD: (_, { id }) => ({
          id,
          name: `Product#${id}`,
        }),
      },
    },
  });

  const gatewaySchema = stitchSchemas({
    subschemas: [
      {
        schema: A,
        merge: {
          Product: {
            selectionSet: `{ id }`,
            fieldName: 'productFromA',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema: B,
        merge: {
          Product: {
            selectionSet: `{ id }`,
            fieldName: 'productFromB',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema: C,
        merge: {
          Category: {
            selectionSet: `{ id }`,
            fieldName: 'categoryFromC',
            args: ({ id }) => ({ id }),
          },
        },
      },
      {
        schema: D,
        merge: {
          Product: {
            selectionSet: `{ id }`,
            fieldName: 'productFromD',
            args: ({ id }) => ({ id }),
          },
        },
      },
    ],
  });

  const query = /* GraphQL */ `
    query {
      productFromD(id: "1") {
        id
        name
        category {
          id
          name
          details
        }
      }
    }
  `;
  const result = await normalizedExecutor({
    schema: gatewaySchema,
    document: parse(query),
  });
  expect(result).toEqual({
    data: {
      productFromD: {
        id: '1',
        name: 'Product#1',
        category: {
          id: '3',
          name: 'Category#3',
          details: 'Details for Product#1',
        },
      },
    },
  });
});
