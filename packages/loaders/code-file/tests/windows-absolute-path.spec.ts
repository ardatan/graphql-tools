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
    it('can import() a module referenced by an absolute drive-letter path', () => {
      const tsxCli = join(dirname(require.resolve('tsx/package.json')), 'dist/cli.mjs');

      const loadFromModulePath = join(__dirname, '../src/load-from-module.ts');
      // Must be `.cjs`: this package's package.json has `"type": "module"`, so a
      // bare `.js` fixture is treated as ESM by Node's loader and its `require()`
      // calls fail. Real ESM `import()` (what this test exercises) needs CJS.
      const fixturePath = join(__dirname, 'test-files/loaders/module-exports.cjs');

      const tmpDir = mkdtempSync(join(tmpdir(), 'code-file-loader-'));
      const scriptPath = join(tmpDir, 'run.mjs');

      writeFileSync(
        scriptPath,
        [
          "import { pathToFileURL } from 'url';",
          `const { tryToLoadFromExport } = await import(pathToFileURL(${JSON.stringify(
            loadFromModulePath,
          )}).href);`,
          'try {',
          `  await tryToLoadFromExport(${JSON.stringify(fixturePath)});`,
          '  console.log(JSON.stringify({ ok: true }));',
          '} catch (e) {',
          '  const message = String(e && e.message);',
          '  console.log(JSON.stringify({ ok: false, message }));',
          "  process.exit(message.includes('ERR_UNSUPPORTED_ESM_URL_SCHEME') ? 1 : 0);",
          '}',
        ].join('\n'),
      );

      const output = execFileSync(process.execPath, [tsxCli, scriptPath], {
        encoding: 'utf8',
      });

      expect(JSON.parse(output.trim())).toEqual({ ok: true });
    });
  },
);
