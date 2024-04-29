import { getOperationAST, isObjectType, Kind, parse, print, SelectionSetNode } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stripWhitespaces } from '../../merge/tests/utils';
import { extractUnavailableFields } from '../src/getFieldsNotInSubschema';

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
    const unavailableFields = extractUnavailableFields(userField, userSelection);
    const extractedSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: unavailableFields,
    };
    expect(stripWhitespaces(print(extractedSelectionSet))).toBe(
      `{ email friends { id name email } }`,
    );
  });
  it('excludes the fields only with __typename', () => {
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
    const unavailableFields = extractUnavailableFields(userField, userSelection);
    const extractedSelectionSet: SelectionSetNode = {
      kind: Kind.SELECTION_SET,
      selections: unavailableFields,
    };
    expect(stripWhitespaces(print(extractedSelectionSet))).toBe('');
  });
});
