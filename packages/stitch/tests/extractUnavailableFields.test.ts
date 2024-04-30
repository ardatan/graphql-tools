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
