import { isAbsolute } from 'path';
import { pathToFileURL } from 'url';

/**
 * Convert a module specifier for use with dynamic `import()`.
 *
 * Absolute filesystem paths must be `file://` URLs when `import()` is a real
 * ESM import — on Windows a bare `C:\...` path is parsed as a `c:` protocol
 * scheme and rejected with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
 *
 * Bob's CJS build rewrites `import()` to `require()`, which needs a filesystem
 * path (not a `file://` URL). Detect CJS via `__filename` and leave absolute
 * paths unchanged there. Bare package / relative specifiers are always unchanged.
 *
 * @internal
 */
export function toImportSpecifier(specifier: string): string {
  if (!isAbsolute(specifier)) {
    return specifier;
  }
  // Present in CJS (including Jest); absent in native ESM / tsx ESM.
  if (typeof __filename === 'string') {
    return specifier;
  }
  return pathToFileURL(specifier).href;
}
