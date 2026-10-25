import path from 'path';
import { parse, print } from 'graphql';
import { uniqueCode } from '@graphql-tools/webpack-loader-runtime';
import { testIf } from '../../testing/utils';
import loader from '../src/index.js';

function useLoader(source: string, options: any, loaderThis: Record<string, unknown> = {}): string {
  return loader.call({ cacheable() {}, query: options, ...loaderThis } as any, source);
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

  expect(doc).toContain(docLine);
  expect(doc).toContain('module.exports = $gqlExports');
  expect(doc).toContain(uniqueCode);
  expect(doc).toContain('$gqlEachNamedDefinition');
  expect(doc).toContain('$gqlExports[opName] = $gqlOneQuery(doc, opName)');

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
  expect(doc).toContain('export { $gql_exp_0 as Foo }');
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

test('esModule exports fragments introduced by #import', () => {
  const fragmentSource = /* GraphQL */ `
    fragment MenuFields on Menu {
      id
      name
    }
  `;
  const docStr = `#import "./menuFields.graphql"
query Foo {
  foo {
    ...MenuFields
  }
}`;
  const doc = useLoader(
    docStr,
    {
      esModule: true,
    },
    {
      context: '/graphql',
      addDependency() {},
      fs: {
        readFileSync(filePath: string) {
          expect(filePath).toBe(path.resolve('/graphql', './menuFields.graphql'));
          return fragmentSource;
        },
      },
    },
  );

  expect(doc).toContain('export { $gql_exp_0 as Foo }');
  expect(doc).toContain('export { $gql_exp_1 as MenuFields }');
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
  expect(doc).toContain('$gqlOneQuery(doc, "deleteMenuMutation")');
  expect(doc).toContain('export { $gql_exp_0 as deleteMenuMutation }');
  expect(doc).toContain('$gqlOneQuery(doc, "upsertMenuMutation")');
  expect(doc).toContain('export { $gql_exp_1 as upsertMenuMutation }');
});

test('variable type names are not treated as fragment spreads', () => {
  const docStr = /* GraphQL */ `
    mutation upsertMenuMutation($input: MenuFields) {
      upsertMenu(input: $input)
    }
    mutation deleteMenuMutation {
      deleteMenu {
        ...MenuFields
      }
    }
    fragment MenuFields on Menu {
      id
    }
  `;

  const exported = evaluateLoader(docStr);
  expect(print(exported.upsertMenuMutation)).toBe(
    print(
      parse(/* GraphQL */ `
        mutation upsertMenuMutation($input: MenuFields) {
          upsertMenu(input: $input)
        }
      `),
    ),
  );
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
        }
      `),
    ),
  );
});

test('operation and fragment with the same name cannot be exported', () => {
  const docStr = /* GraphQL */ `
    query Shared {
      node {
        ...Shared
      }
    }
    fragment Shared on Node {
      id
    }
  `;

  expect(() => useLoader(docStr, {})).toThrow(
    'GraphQL operation and fragment both named "Shared" cannot be exported from the same file',
  );
});

test('esModule exports JavaScript keyword operation names as aliases', () => {
  const docStr = /* GraphQL */ `
    mutation delete {
      deleteMenu
    }
  `;
  const doc = useLoader(docStr, {
    esModule: true,
  });

  expect(doc).toContain('$gqlOneQuery(doc, "delete")');
  expect(doc).toContain('export { $gql_exp_0 as delete }');
});

test('CommonJS rejects operation names that would replace the document', () => {
  const docStr = /* GraphQL */ `
    query definitions {
      foo
    }
  `;

  expect(() => useLoader(docStr, {})).toThrow(
    'Cannot export GraphQL operation or fragment named "definitions" because it would replace the default document',
  );
});

test('operation named oneQuery still exports without replacing the helper', () => {
  const docStr = /* GraphQL */ `
    query oneQuery {
      foo
    }
    query other {
      bar
    }
  `;

  const exported = evaluateLoader(docStr);
  expect(print(exported.oneQuery)).toBe(
    print(
      parse(/* GraphQL */ `
        query oneQuery {
          foo
        }
      `),
    ),
  );
  expect(print(exported.other)).toBe(
    print(
      parse(/* GraphQL */ `
        query other {
          bar
        }
      `),
    ),
  );
});
