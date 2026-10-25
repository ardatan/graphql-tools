import { parse, print } from 'graphql';
import { uniqueCode } from '@graphql-tools/webpack-loader-runtime';
import { testIf } from '../../testing/utils';
import loader from '../src/index.js';

function useLoader(source: string, options: any): string {
  return loader.call({ cacheable() {}, query: options } as any, source);
}

function evaluateLoader(
  source: string,
  options: any = {},
  requireImpl: (id: string) => unknown = () => {
    throw new Error('unexpected require');
  },
) {
  const code = useLoader(source, options);
  const module = { exports: {} as any };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', code)(module, module.exports, requireImpl);
  return module.exports;
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
  expect(doc).toContain(uniqueCode);
  expect(doc).toContain('module.exports["Foo"] = oneQuery(doc, "Foo")');

  const exported = evaluateLoader(docStr);
  expect(print(exported)).toBe(print(parse(docStr)));
  expect(print(exported.Foo)).toBe(print(parse(docStr)));
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
  expect(doc).toContain(uniqueCode);
  expect(doc).toContain('export var Foo = oneQuery(doc, "Foo")');
});

test('esModule #import uses the default export of the required document (#7935)', () => {
  const docStr = `#import "./frag.graphql"\nquery Foo {\n  foo\n}`;
  const doc = useLoader(docStr, {
    esModule: true,
  });

  expect(doc).toContain('require("./frag.graphql").default');
  expect(doc).toContain('export default doc');
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

test('multiple named operations export each operation by name', () => {
  const docStr = /* GraphQL */ `
    mutation deleteMenuMutation {
      deleteMenu
    }
    mutation upsertMenuMutation {
      upsertMenu
    }
  `;

  expect(() => useLoader(docStr, {})).not.toThrow();

  const exported = evaluateLoader(docStr);
  expect(print(exported)).toBe(print(parse(docStr)));
  expect(print(exported.deleteMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation deleteMenuMutation {
          deleteMenu
        }
      `),
    ),
  );
  expect(print(exported.upsertMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation upsertMenuMutation {
          upsertMenu
        }
      `),
    ),
  );
});

test('named operation export includes only the fragments that operation uses', () => {
  const docStr = /* GraphQL */ `
    mutation deleteMenuMutation {
      deleteMenu {
        ...MenuFields
      }
    }
    mutation upsertMenuMutation {
      upsertMenu {
        id
      }
    }
    fragment MenuFields on Menu {
      id
      name
    }
  `;

  const exported = evaluateLoader(docStr);
  expect(print(exported.deleteMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation deleteMenuMutation {
          deleteMenu {
            ...MenuFields
          }
        }
        fragment MenuFields on Menu {
          id
          name
        }
      `),
    ),
  );
  expect(print(exported.upsertMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation upsertMenuMutation {
          upsertMenu {
            id
          }
        }
      `),
    ),
  );
  expect(print(exported.MenuFields)).toBe(
    print(
      parse(/* GraphQL */ `
        fragment MenuFields on Menu {
          id
          name
        }
      `),
    ),
  );
});

test('imported fragments are available to named operation exports', () => {
  const docStr = `#import "./menuFields.graphql"
mutation deleteMenuMutation {
  deleteMenu {
    ...MenuFields
  }
}
mutation upsertMenuMutation {
  upsertMenu {
    id
  }
}`;
  const fragmentDoc = parse(
    /* GraphQL */ `
      fragment MenuFields on Menu {
        id
        name
      }
    `,
    { noLocation: true },
  );

  const exported = evaluateLoader(docStr, {}, (id: string) => {
    expect(id).toBe('./menuFields.graphql');
    return fragmentDoc;
  });

  expect(print(exported.deleteMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation deleteMenuMutation {
          deleteMenu {
            ...MenuFields
          }
        }
        fragment MenuFields on Menu {
          id
          name
        }
      `),
    ),
  );
  expect(print(exported.upsertMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation upsertMenuMutation {
          upsertMenu {
            id
          }
        }
      `),
    ),
  );
});

test('single unnamed operation still default-exports the document', () => {
  const docStr = /* GraphQL */ `
    {
      foo
    }
  `;
  const exported = evaluateLoader(docStr);
  expect(print(exported)).toBe(print(parse(docStr)));
  expect(exported.foo).toBeUndefined();
});

test('multiple unnamed operations throw', () => {
  const docStr = /* GraphQL */ `
    mutation {
      deleteMenu
    }
    mutation {
      upsertMenu
    }
  `;

  expect(() => useLoader(docStr, {})).toThrow(
    'GraphQL operation names are required when a file contains multiple operations',
  );
});

test('esModule emits a named export for each operation', () => {
  const docStr = /* GraphQL */ `
    mutation deleteMenuMutation {
      deleteMenu
    }
    mutation upsertMenuMutation {
      upsertMenu
    }
  `;
  const doc = useLoader(docStr, {
    esModule: true,
  });

  expect(doc).toContain('export default doc');
  expect(doc).toContain('export var deleteMenuMutation = oneQuery(doc, "deleteMenuMutation")');
  expect(doc).toContain('export var upsertMenuMutation = oneQuery(doc, "upsertMenuMutation")');
});
