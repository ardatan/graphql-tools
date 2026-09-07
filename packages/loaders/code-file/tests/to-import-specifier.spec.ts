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
});
