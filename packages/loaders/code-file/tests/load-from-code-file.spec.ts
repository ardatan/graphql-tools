/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import * as path from 'path';
import { CodeFileLoader } from '../src/index.js';
import { parse } from 'graphql';

describe('loadFromCodeFile', () => {
  const loader = new CodeFileLoader();

  it('Should throw an error when a document is loaded using AST and the document is not valid', async () => {
    try {
      const result = await loader.load('./test-files/invalid-anon-doc.js', {
        noRequire: true,
        cwd: __dirname,
      });
      const loaded = result?.[0];
      const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

      expect(doc).toBeFalsy();
    } catch (e: any) {
      expect(e.message).toContain('Syntax Error: Unexpected Name "InvalidGetUser"');
    }
  });

  it('should raise an error when the glob matches valid and invalid schema files with `noSilentErrors` set to true', async () => {
    const result = loader.load('./test-files/{valid,invalid-anon}-doc.js', {
      cwd: __dirname,
      noSilentErrors: true,
    });
    await expect(result).rejects.toThrow();
  });

  it('should not raise an error when the glob matches valid and invalid schema files without the `noSilentErrors` option present', async () => {
    const result = await loader.load('./test-files/{valid,invalid-anon}-doc.js', {
      cwd: __dirname,
    });
    const loaded = result?.[0];
    const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

    expect(doc?.kind).toEqual('Document');
  });

  it('should load a valid file', async () => {
    const result = await loader.load('./test-files/valid-doc.js', {
      noRequire: true,
      cwd: __dirname,
    });
    const loaded = result?.[0];
    const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

    expect(doc?.kind).toEqual('Document');
  });

  it('should consider options.cwd', async () => {
    const result = await loader.load('valid-doc.js', {
      cwd: path.resolve(__dirname, 'test-files'),
      noRequire: true,
    });
    const loaded = result?.[0];
    const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

    expect(doc?.kind).toEqual('Document');
  });

  it('should load a TypeScript file using decorator', async () => {
    const result = await loader.load('./test-files/with-decorator-doc.ts', {
      noRequire: true,
      cwd: __dirname,
    });
    const loaded = result?.[0];
    const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

    expect(doc?.kind).toEqual('Document');
  });

  it('should support string interpolation', async () => {
    const result = await loader.load('./test-files/string-interpolation.js', {
      cwd: __dirname,
    });
    const loaded = result?.[0];
    const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

    expect(doc?.kind).toEqual('Document');
  });

  it('does not try to load single file it cannot load', async () => {
    const loader = new CodeFileLoader({
      pluckConfig: {
        skipIndent: true,
      },
    });
    const loaded = await loader.load('./test-files/other.graphql', {
      cwd: __dirname,
    });
    expect(loaded).toEqual([]);
  });
});

describe('loadFromCodeFileSync', () => {
  const loader = new CodeFileLoader();

  it('Should throw an error when a document is loaded using AST and the document is not valid', () => {
    expect(() => {
      const result = loader.loadSync('./test-files/invalid-anon-doc.js', {
        noRequire: true,
        cwd: __dirname,
      });
      const loaded = result?.[0];
      const doc = loaded?.document ? loaded?.document : parse(loaded?.rawSDL!);

      expect(doc?.kind).toEqual('Document');
    }).toThrowError('Syntax Error: Unexpected Name "InvalidGetUser"');
  });

  it('should raise an error when the glob matches valid and invalid schema files with `noSilentErrors` set to true', async () => {
    const result = () =>
      loader.loadSync('./test-files/{valid,invalid-anon}-doc.js', {
        cwd: __dirname,
        noSilentErrors: true,
      });
    expect(result).toThrow();
  });

  it('should not raise an error when the glob matches valid and invalid schema files without the `noSilentErrors` option present', async () => {
    const result = loader.loadSync('./test-files/{valid,invalid-anon}-doc.js', {
      cwd: __dirname,
    });
    const loaded = result?.[0];
    const doc = loaded?.document;

    expect(doc?.kind).toEqual('Document');
  });

  it('should load a valid file', () => {
    const result = loader.loadSync('./test-files/valid-doc.js', {
      noRequire: true,
      cwd: __dirname,
    });
    const loaded = result?.[0];
    const doc = loaded?.document;

    expect(doc?.kind).toEqual('Document');
  });

  it('should consider options.cwd', () => {
    const result = loader.loadSync('valid-doc.js', {
      cwd: path.resolve(__dirname, 'test-files'),
      noRequire: true,
    });
    const loaded = result?.[0];
    const doc = loaded?.document;

    expect(doc?.kind).toEqual('Document');
  });

  it('should support string interpolation', () => {
    const result = loader.loadSync('./test-files/string-interpolation.js', {
      cwd: __dirname,
    });

    const loaded = result?.[0];
    const doc = loaded?.document;

    expect(doc?.kind).toEqual('Document');
  });

  it('should support loading many in same file', () => {
    const loadedSources = loader.loadSync('./test-files/multiple-from-file.ts', {
      cwd: __dirname,
      pluckConfig: {
        skipIndent: true,
      },
    });
    expect(loadedSources?.length).toEqual(3);
    expect(loadedSources![0].rawSDL).toBeDefined();
    expect(loadedSources![0].rawSDL).toMatchInlineSnapshot(`
"
  query Foo {
    Tweets {
      id
    }
  }
"
`);
    expect(loadedSources![1].rawSDL).toBeDefined();
    expect(loadedSources![1].rawSDL).toMatchInlineSnapshot(`
"
  fragment Lel on Tweet {
    id
    body
  }
"
`);
    expect(loadedSources![2].rawSDL).toBeDefined();
    expect(loadedSources![2].rawSDL).toMatchInlineSnapshot(`
"
  query Bar {
    Tweets {
      ...Lel
    }
  }
"
`);
  });

  it('can inherit config options from constructor', () => {
    const loader = new CodeFileLoader({
      pluckConfig: {
        skipIndent: true,
      },
    });
    const loadedSources = loader.loadSync('./test-files/multiple-from-file.ts', {
      cwd: __dirname,
    });
    expect(loadedSources?.length).toEqual(3);
    expect(loadedSources![0].rawSDL).toBeDefined();
    expect(loadedSources![0].rawSDL).toMatchInlineSnapshot(`
      "
        query Foo {
          Tweets {
            id
          }
        }
      "
    `);
    expect(loadedSources![1].rawSDL).toBeDefined();
    expect(loadedSources![1].rawSDL).toMatchInlineSnapshot(`
      "
        fragment Lel on Tweet {
          id
          body
        }
      "
    `);
    expect(loadedSources![2].rawSDL).toBeDefined();
    expect(loadedSources![2].rawSDL).toMatchInlineSnapshot(`
      "
        query Bar {
          Tweets {
            ...Lel
          }
        }
      "
    `);
  });

  it('does not try to load single file it cannot load', async () => {
    const loader = new CodeFileLoader({
      pluckConfig: {
        skipIndent: true,
      },
    });
    const loaded = loader.loadSync('./test-files/other.graphql', {
      cwd: __dirname,
    });
    expect(loaded).toEqual([]);
  });
});
