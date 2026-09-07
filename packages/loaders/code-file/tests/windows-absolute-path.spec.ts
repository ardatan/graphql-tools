import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

// `tryToLoadFromExport` used to call `await import(filepath)` on a raw absolute
// filesystem path. Node's dynamic `import()` always resolves its specifier
// through the ESM loader; on Windows a path like `C:\Users\me\schema.js` was
// misparsed as scheme "c:" (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). See #8420.
//
// Jest's babel transform rewrites `await import(...)` into `require()`, which
// hides the bug in-process, so this test spawns a real Node process via `tsx`
// to exercise the actual ESM loader path.
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
