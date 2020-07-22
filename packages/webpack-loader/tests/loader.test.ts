import '../../testing/to-be-similar-string';
import { print, parse } from 'graphql';
import loader from '../src/index';

function useLoader(source: string, options: any): string {
  return loader.call({cacheable() {}, query: options}, source)
}

test('basic query', () => {
  const docStr = /* GraphQL */`
    query Foo {
      foo
    }
  `;
  const doc = useLoader(docStr, {});

  expect(doc).toBeSimilarString(`
    const doc = ${JSON.stringify(parse(docStr, { noLocation: true }))};

    const names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          const name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }

    module.exports = doc
  `);

  // eslint-disable-next-line no-eval
  expect(print(eval(doc))).toBe(print(parse(docStr)));
});

test('basic query with esModules on', () => {
  const docStr = /* GraphQL */`
    query Foo {
      foo
    }
  `;
  const doc = useLoader(docStr, {
    esModule: true
  });

  expect(doc).toBeSimilarString(`
    const doc = ${JSON.stringify(parse(docStr, { noLocation: true }))};

    const names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          const name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }

    export default doc
  `);
});
