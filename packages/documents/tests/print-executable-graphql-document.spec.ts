import { parse } from 'graphql';
import { printExecutableGraphQLDocument } from '@graphql-tools/documents';

describe('printExecutableGraphQLDocument', () => {
  test('print simple document', () => {
    const inputDocument = parse(/* GraphQL */ `
      query A {
        c
        b
        a
      }
    `);
    const outputStr = printExecutableGraphQLDocument(inputDocument);
    expect(outputStr).toBe(`query A { a b c }`);
  });

  test('fragments are always before query operations', () => {
    const inputDocument = parse(/* GraphQL */ `
      query A {
        ...B
        ...A
        c
        b
        a
      }

      fragment B on Query {
        c
        b
        a
      }

      fragment A on Query {
        c
        b
        a
      }
    `);
    const outputStr = printExecutableGraphQLDocument(inputDocument);
    expect(outputStr).toBe(
      `fragment A on Query { a b c } fragment B on Query { a b c } query A { a b c ...A ...B }`,
    );
  });

  test('inline fragments are sorted alphabetically based on the selection set', () => {
    const inputDocument = parse(/* GraphQL */ `
      query A {
        ... on Query {
          b
        }
        ... on Query {
          a
        }
      }
    `);
    const outputStr = printExecutableGraphQLDocument(inputDocument);
    expect(outputStr).toBe(`query A { ... on Query { a } ... on Query { b } }`);
  });

  test('inline fragments are sorted alphabetically based on the deep selection set', () => {
    const inputDocument = parse(/* GraphQL */ `
      query A {
        ... on Query {
          a {
            ...B
            b
          }
        }
        ... on Query {
          a {
            ...B
            a
          }
        }
      }

      fragment B on Query {
        c
      }
    `);
    const outputStr = printExecutableGraphQLDocument(inputDocument);
    expect(outputStr).toBe(
      `fragment B on Query { c } query A { ... on Query { a { a ...B } } ... on Query { a { b ...B } } }`,
    );
  });

  test('should not sort a mutation as mutations run in series and order matters', () => {
    const inputDocument = parse(/* GraphQL */ `
      mutation A {
        ... on Mutation {
          c
          b
          d
        }
        c {
          d
          e {
            b
            a
          }
          f
        }
        b
        a
      }
    `);
    const outputStr = printExecutableGraphQLDocument(inputDocument);
    expect(outputStr).toBe(`mutation A { ... on Mutation { c b d } c { d e { a b } f } b a }`);
  });
});
