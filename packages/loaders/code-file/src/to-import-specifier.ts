import { isAbsolute } from 'path';
import { pathToFileURL } from 'url';

/**
 * Convert a module specifier for use with dynamic `import()`.
 *
 * Absolute filesystem paths must be `file://` URLs — on Windows a bare
 * `C:\...` path is parsed as a `c:` protocol scheme and rejected with
 * `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Bare package specifiers are unchanged.
 *
 * @internal
 */
export function toImportSpecifier(specifier: string): string {
  return isAbsolute(specifier) ? pathToFileURL(specifier).href : specifier;
}
