import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

// `tryToLoadFromExport` calls `await import(filepath)` on a raw, absolute
// filesystem path. Node's dynamic `import()` always resolves its specifier
// through the ESM loader, regardless of whether the calling module is itself
// CJS or ESM. On Windows, an absolute path like `C:\Users\me\schema.js` gets
// misparsed as a URL with scheme "c:", throwing
// `ERR_UNSUPPORTED_ESM_URL_SCHEME`. See:
// https://github.com/ardatan/graphql-tools/issues/8420
//
// This suite's babel/ts-jest transform rewrites `await import(...)` into a
// `require()`-based call for the CJS test environment, which hides the bug
// entirely (it never touches Node's real ESM loader), so instead of testing
// through Jest's own transform, this spawns a real Node process (via `tsx`,
// to run the TypeScript source directly with no build step) to exercise the
// actual runtime behavior.
(process.platform === 'win32' ? describe : describe.skip)(
  'CodeFileLoader with absolute Windows paths (issue #8420)',
  () => {
    it('loads a schema module referenced by an absolute path with a drive letter', () => {
      const tsxCli = join(dirname(require.resolve('tsx/package.json')), 'dist/cli.mjs');

      const loadFromModulePath = join(__dirname, '../src/load-from-module.ts');
      const fixturePath = join(__dirname, 'test-files/loaders/module-exports.js');

      const tmpDir = mkdtempSync(join(tmpdir(), 'code-file-loader-'));
      const scriptPath = join(tmpDir, 'run.mjs');

      writeFileSync(
        scriptPath,
        [
          "import { pathToFileURL } from 'url';",
          `const { tryToLoadFromExport } = await import(pathToFileURL(${JSON.stringify(
            loadFromModulePath,
          )}).href);`,
          `const result = await tryToLoadFromExport(${JSON.stringify(fixturePath)});`,
          'console.log(JSON.stringify({ hasSchema: !!result }));',
        ].join('\n'),
      );

      const output = execFileSync(process.execPath, [tsxCli, scriptPath], {
        encoding: 'utf8',
      });

      expect(JSON.parse(output.trim())).toEqual({ hasSchema: true });
    });
  },
);
