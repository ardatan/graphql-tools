import { print, parse } from 'graphql';
import { parseDocument } from '../src/parser.js';

test('basic query', () => {
  const docStr = /* GraphQL */ `
    query Foo {
      foo
    }
  `;
  const doc = parseDocument(docStr);

  expect(print(doc)).toBe(print(parse(docStr)));
});

test('inline fragment', () => {
  const docStr = /* GraphQL */ `
    query Foo {
      foo {
        ... on Foo {
          id
        }
      }
    }
  `;
  const doc = parseDocument(docStr);

  expect(print(doc)).toBe(print(parse(docStr)));
});

test('fragment spread', () => {
  const docStr = /* GraphQL */ `
    query Foo {
      foo {
        ...fooFragment
      }
    }
    fragment fooFragment on Foo {
      id
    }
  `;
  const doc = parseDocument(docStr);

  expect(print(doc)).toBe(print(parse(docStr)));
});
