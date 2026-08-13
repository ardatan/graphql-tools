import { parse, print } from 'graphql';
import { removeDescriptions } from '../src/index.js';

describe('removeDescription', () => {
  it('should remove descriptions for schemas', () => {
    const doc = parse(/* GraphQL */ `
      """
      test
      """
      type Query {
        """
        something
        """
        f: String
      }

      """
      test
      """
      type Mutation {
        """
        something
        """
        f(
          """
          something
          """
          input: InputType
        ): String
      }

      """
      test
      """
      input InputType {
        """
        something
        """
        f: String
      }

      """
      test
      """
      directive @test on FIELD_DEFINITION

      """
      test
      """
      enum Test {
        """
        something
        """
        A
      }

      """
      test
      """
      interface TestInterface {
        """
        something
        """
        f: String
      }

      """
      test
      """
      union TestUnion = Test | TestInterface

      """
      test
      """
      scalar TestScalar
    `);

    const out = removeDescriptions(doc);
    expect(print(out).trim()).toBe(
      /* GraphQL */ `
type Query {
  f: String
}

type Mutation {
  f(input: InputType): String
}

input InputType {
  f: String
}

directive @test on FIELD_DEFINITION

enum Test {
  A
}

interface TestInterface {
  f: String
}

union TestUnion = Test | TestInterface

scalar TestScalar
    `.trim(),
    );
  });

  it('should remove descriptions from operations, variables, and fragments', () => {
    const doc = parse(/* GraphQL */ `
      """
      OPERATION DESCRIPTION
      """
      query user(
        """
        VARIABLE DESCRIPTION
        """
        $id: ID!
      ) {
        user(id: $id) {
          ...userFields
        }
      }

      """
      FRAGMENT DESCRIPTION
      """
      fragment userFields on User {
        id
        username
      }
    `);

    const out = removeDescriptions(doc);
    expect(print(out).trim()).toBe(
      /* GraphQL */ `
query user($id: ID!) {
  user(id: $id) {
    ...userFields
  }
}

fragment userFields on User {
  id
  username
}
    `.trim(),
    );
  });
});
