import '../../testing/to-be-similar-string';
import { parse, print } from 'graphql';
import { uniqueCode } from '@graphql-tools/webpack-loader-runtime';
import { testIf } from '../../testing/utils';
import loader from '../src/index.js';

function useLoader(source: string, options: any): string {
  return loader.call({ cacheable() {}, query: options } as any, source);
}

testIf(!globalThis.Bun)('basic query', () => {
  const docStr = /* GraphQL */ `
    query Foo {
      foo
    }
  `;
  const doc = useLoader(docStr, {});

  const docLine = `var doc = ${JSON.stringify(parse(docStr, { noLocation: true }))};`;
  const exportLine = `module.exports = doc`;

  expect(doc).toContain(docLine);
  expect(doc).toContain(exportLine);

  expect(doc).toBeSimilarString(`
    ${docLine}

    ${uniqueCode}

    ${exportLine}
  `);

  // eslint-disable-next-line no-eval
  expect(print(eval(doc))).toBe(print(parse(docStr)));
});

test('basic query with esModules on', () => {
  const docStr = /* GraphQL */ `
    query Foo {
      foo
    }
  `;
  const doc = useLoader(docStr, {
    esModule: true,
  });

  const docLine = `var doc = ${JSON.stringify(parse(docStr, { noLocation: true }))};`;
  const exportLine = `export default doc`;

  expect(doc).toContain(docLine);
  expect(doc).toContain(exportLine);

  expect(doc).toBeSimilarString(`
    ${docLine}

    ${uniqueCode}

    ${exportLine}
  `);
});

test('replaceKinds enabled', () => {
  const docStr = /* GraphQL */ `
    query Foo {
      foo
    }
  `;
  const doc = useLoader(docStr, {
    replaceKinds: true,
  });

  expect(doc).toMatch(`var Kind = require('graphql/language/kinds');`);
  expect(doc).toMatch(`"kind": Kind.DOCUMENT`);
  expect(doc).not.toMatch(`"kind": "`);
});
