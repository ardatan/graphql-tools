import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { toImportSpecifier } from '../src/to-import-specifier.js';

describe('toImportSpecifier', () => {
  it('converts absolute filesystem paths to file:// URLs', () => {
    const absolutePath = resolve('/tmp/schema.js');
    expect(toImportSpecifier(absolutePath)).toBe(pathToFileURL(absolutePath).href);
    expect(toImportSpecifier(absolutePath)).toMatch(/^file:\/\//);
  });

  it('leaves bare package specifiers unchanged', () => {
    expect(toImportSpecifier('ts-node/register')).toBe('ts-node/register');
    expect(toImportSpecifier('@babel/register')).toBe('@babel/register');
  });

  it('leaves relative paths unchanged', () => {
    expect(toImportSpecifier('./schema.js')).toBe('./schema.js');
    expect(toImportSpecifier('../schema.js')).toBe('../schema.js');
  });

  // On Windows, path.isAbsolute recognizes drive-letter paths; on POSIX it does not.
  (process.platform === 'win32' ? it : it.skip)(
    'converts Windows drive paths to file:// URLs',
    () => {
      const windowsPath = 'C:\\Users\\me\\project\\schema.js';
      expect(toImportSpecifier(windowsPath)).toBe(pathToFileURL(windowsPath).href);
      expect(toImportSpecifier(windowsPath)).toMatch(/^file:\/\/\/C:/);
    },
  );

  it('Node rejects raw Windows absolute paths as import() specifiers', () => {
    // Run outside Jest's module transform so we hit Node's ESM loader directly.
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `import('C:\\\\Users\\\\me\\\\project\\\\schema.js').then(
          () => { console.log('UNEXPECTED_OK'); process.exit(1); },
          (e) => { console.log(e.code); process.exit(0); },
        )`,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('ERR_UNSUPPORTED_ESM_URL_SCHEME');
  });
});
