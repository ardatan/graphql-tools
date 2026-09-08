import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { toImportSpecifier } from '../src/to-import-specifier.js';

const isCjsRuntime = typeof __filename === 'string';

describe('toImportSpecifier', () => {
  it('leaves bare package specifiers unchanged', () => {
    expect(toImportSpecifier('ts-node/register')).toBe('ts-node/register');
    expect(toImportSpecifier('@babel/register')).toBe('@babel/register');
  });

  it('leaves relative paths unchanged', () => {
    expect(toImportSpecifier('./schema.js')).toBe('./schema.js');
    expect(toImportSpecifier('../schema.js')).toBe('../schema.js');
  });

  it('handles absolute filesystem paths for the current module system', () => {
    const absolutePath = resolve('/tmp/schema.js');
    if (isCjsRuntime) {
      // CJS / Jest: bob rewrites import()→require(), which needs a raw path.
      expect(toImportSpecifier(absolutePath)).toBe(absolutePath);
    } else {
      expect(toImportSpecifier(absolutePath)).toBe(pathToFileURL(absolutePath).href);
      expect(toImportSpecifier(absolutePath)).toMatch(/^file:\/\//);
    }
  });

  // On Windows, path.isAbsolute recognizes drive-letter paths; on POSIX it does not.
  (process.platform === 'win32' ? it : it.skip)(
    'handles Windows drive paths for the current module system',
    () => {
      const windowsPath = 'C:\\Users\\me\\project\\schema.js';
      if (isCjsRuntime) {
        expect(toImportSpecifier(windowsPath)).toBe(windowsPath);
      } else {
        expect(toImportSpecifier(windowsPath)).toBe(pathToFileURL(windowsPath).href);
        expect(toImportSpecifier(windowsPath)).toMatch(/^file:\/\/\/C:/);
      }
    },
  );
});
