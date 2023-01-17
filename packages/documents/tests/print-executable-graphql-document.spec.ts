import { printExecutableGraphQLDocument } from '@graphql-tools/documents';
import { parse } from 'graphql';

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
    expect(outputStr).toMatchInlineSnapshot(`"query A { a b c }"`);
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
    expect(outputStr).toMatchInlineSnapshot(
      `"fragment A on Query { a b c } fragment B on Query { a b c } query A { a b c ...A ...B }"`
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
    expect(outputStr).toMatchInlineSnapshot(`"query A { ... on Query { a } ... on Query { b } }"`);
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
    expect(outputStr).toMatchInlineSnapshot(
      `"fragment B on Query { c } query A { ... on Query { a { a ...B } } ... on Query { a { b ...B } } }"`
    );
  });
});
