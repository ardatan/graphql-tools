import { print, parse } from 'graphql';
import {parseDocument} from '../src/parser';

test('basic query', () => {
  const docStr = /* GraphQL */`
    query Foo {
      foo
    }
  `;
  const doc = parseDocument(docStr);

  expect(print(doc)).toBe(print(parse(docStr)));
});

test('inline fragment', () => {
  const docStr = /* GraphQL */`
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
  const docStr = /* GraphQL */`
    query Foo {
      foo {
        ...fooFrgmnt
      }
    }
    fragment fooFrgmnt on Foo {
      id
    }
  `;
  const doc = parseDocument(docStr);

  expect(print(doc)).toBe(print(parse(docStr)));
});
