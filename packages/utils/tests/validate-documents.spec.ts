import { validateGraphQlDocuments } from '../src/index.js';
import { buildSchema, parse, GraphQLError, Source } from 'graphql';

describe('validateGraphQlDocuments', () => {
  it('Should throw an informative error when validation errors happens, also check for fragments validation even why they are duplicated', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type OtherStuff {
        foo: String
      }

      type Pizzeria {
        id: Int
        name: String
        location: String
      }

      type Query {
        otherStuff: OtherStuff
      }
    `);

    const fragment = /* GraphQL */ `
      fragment pizzeriaFragment on Pizzeria {
        name
      }
    `;

    const result = validateGraphQlDocuments(schema, [
      parse(new Source(fragment, 'packages/client/src/fragments/pizzeriaFragment.fragment.graphql')),
      parse(
        new Source(
          /* GraphQL */ `
            query searchPage {
              otherStuff {
                foo
              }
              ...pizzeriaFragment
            }

            ${fragment}
          `,
          'packages/client/src/pages/search/searchPage.query.graphql'
        )
      ),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].source?.name).toBe('packages/client/src/pages/search/searchPage.query.graphql');
    expect(result[0] instanceof GraphQLError).toBeTruthy();
    expect(result[0].message).toBe(
      'Fragment "pizzeriaFragment" cannot be spread here as objects of type "Query" can never be of type "Pizzeria".'
    );
    expect(result[0].stack)
      .toBe(`Fragment "pizzeriaFragment" cannot be spread here as objects of type "Query" can never be of type "Pizzeria".
    at packages/client/src/pages/search/searchPage.query.graphql:6:15`);
  });

  it('Should not swallow fragments on operation/fragment name conflict', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        currentUser(id: ID!): User!
      }

      type User {
        id: ID!
        username: String
        email: String!
      }
    `);

    const result = validateGraphQlDocuments(schema, [
      parse(
        new Source(
          /* GraphQL */ `
            fragment CurrentUser on User {
              id
              email
              username
            }

            query CurrentUser {
              currentUser(id: "1") {
                ...CurrentUser
              }
            }
          `,
          'packages/client/src/pages/search/operations.graphql'
        )
      ),
    ]);

    expect(result).toHaveLength(0);
  });
});
