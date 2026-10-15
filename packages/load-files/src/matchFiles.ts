import { Dirent, globSync, readdirSync, statSync } from 'node:fs';
import { glob as globAsync, readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { asArray } from '@graphql-tools/utils';

export interface MatchFilesOptions {
  cwd?: string;
  absolute?: boolean;
  ignore?: string | string[];
  onlyFiles?: boolean;
  [key: string]: unknown;
}

const GLOB_MAGIC = /[*?[{\\]/;
const EXTGLOB_PREFIX = new Set(['?', '*', '+', '@', '!']);
const MAX_SYMLINK_WALK_DEPTH = 32;

/**
 * `fs.glob` `followSymlinks` landed in Node 26.1 and was backported to 24.16.
 * On older engines we re-root recursive patterns onto discovered symlink dirs.
 */
const SUPPORTS_GLOB_FOLLOW_SYMLINKS = (() => {
  const [major = 0, minor = 0] = process.versions.node.split('.').map(part => Number(part));
  if (major > 26) {
    return true;
  }
  if (major === 26) {
    return minor >= 1;
  }
  if (major === 24) {
    return minor >= 16;
  }
  return false;
})();

/** Whole-pattern negation (`!foo`), not a negative extglob (`!(foo)`). */
function isWholePatternNegation(pattern: string): boolean {
  return pattern.startsWith('!') && !pattern.startsWith('!(');
}

function normalizeIgnore(ignore: string): string {
  return isWholePatternNegation(ignore) ? ignore.slice(1) : ignore;
}

function splitPatterns(patterns: string | string[]): {
  include: string[];
  ignore: string[];
} {
  const include: string[] = [];
  const ignore: string[] = [];
  for (const pattern of asArray(patterns)) {
    if (isWholePatternNegation(pattern)) {
      ignore.push(pattern.slice(1));
    } else {
      include.push(pattern);
    }
  }
  return { include, ignore };
}

/**
 * Convert a few globby/minimatch shorthands that Node's fs.glob does not accept
 * (e.g. `(a|b)` → `{a,b}`) while leaving extglobs like `+(...)` / `!(...)` alone.
 *
 * Implemented without nested regex quantifiers to avoid ReDoS on adversarial input.
 */
function normalizeIncludePattern(pattern: string): string {
  if (!pattern.endsWith(')')) {
    return pattern;
  }
  const open = pattern.lastIndexOf('(');
  if (open < 0) {
    return pattern;
  }
  if (open > 0 && EXTGLOB_PREFIX.has(pattern.charAt(open - 1))) {
    return pattern;
  }
  const inner = pattern.slice(open + 1, -1);
  if (!inner.includes('|') || /[()/]/.test(inner)) {
    return pattern;
  }
  return `${pattern.slice(0, open)}{${inner.replace(/\|/g, ',')}}`;
}

function pathFromDirent(entry: Dirent): string {
  const parent = entry.parentPath || (entry as Dirent & { path?: string }).path || '';
  return join(parent, entry.name);
}

async function isFileLike(entry: string | Dirent): Promise<boolean> {
  if (typeof entry === 'string') {
    return !entry.replace(/\\/g, '/').endsWith('/');
  }
  if (entry.isFile()) {
    return true;
  }
  if (!entry.isSymbolicLink()) {
    return false;
  }
  try {
    return (await stat(pathFromDirent(entry))).isFile();
  } catch {
    return false;
  }
}

function isFileLikeSync(entry: string | Dirent): boolean {
  if (typeof entry === 'string') {
    return !entry.replace(/\\/g, '/').endsWith('/');
  }
  if (entry.isFile()) {
    return true;
  }
  if (!entry.isSymbolicLink()) {
    return false;
  }
  try {
    return statSync(pathFromDirent(entry)).isFile();
  } catch {
    return false;
  }
}

function toPath(entry: string | Dirent): string {
  return typeof entry === 'string' ? entry : pathFromDirent(entry);
}

function toUnixPath(path: string): string {
  // Backslash is a valid filename character on POSIX; only normalize separators on Windows.
  return process.platform === 'win32' ? path.replace(/\\/g, '/') : path;
}

function finalizePaths(paths: string[], cwd: string, absolute: boolean): string[] {
  // Always emit POSIX separators so Windows matches globby-era loaders/tests
  // and Source.name stays stable across platforms.
  const converted = absolute
    ? paths.map(m => toUnixPath(isAbsolute(m) ? m : resolve(cwd, m)))
    : paths.map(m => toUnixPath(isAbsolute(m) ? relative(cwd, m) : m));
  return [...new Set(converted)];
}

async function expandPattern(pattern: string, cwd: string): Promise<string> {
  const normalized = normalizeIncludePattern(pattern);
  if (GLOB_MAGIC.test(normalized)) {
    return normalized;
  }
  const candidate = isAbsolute(normalized) ? normalized : resolve(cwd, normalized);
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) {
      return normalized.replace(/\/$/, '') + '/**';
    }
  } catch {
    // Not a path we can stat — use as-is (may still be a non-magic filename).
  }
  return normalized;
}

function expandPatternSync(pattern: string, cwd: string): string {
  const normalized = normalizeIncludePattern(pattern);
  if (GLOB_MAGIC.test(normalized)) {
    return normalized;
  }
  const candidate = isAbsolute(normalized) ? normalized : resolve(cwd, normalized);
  try {
    if (statSync(candidate).isDirectory()) {
      return normalized.replace(/\/$/, '') + '/**';
    }
  } catch {
    // Not a path we can stat — use as-is.
  }
  return normalized;
}

/** Literal directory prefix before the first glob metacharacter. */
function literalDirPrefix(pattern: string): string {
  const match = /^([^?*[{]*)/.exec(pattern);
  const raw = match?.[1] ?? '';
  const slash = raw.lastIndexOf('/');
  return slash >= 0 ? raw.slice(0, slash + 1) : '';
}

/**
 * Relative directories to scan for symlink roots. `''` means `cwd` itself.
 * Empty array means no recursive patterns — skip the walk entirely.
 */
function symlinkScanRoots(patterns: string[]): string[] {
  const roots = new Set<string>();
  for (const pattern of patterns) {
    if (!pattern.includes('**')) {
      continue;
    }
    roots.add(literalDirPrefix(pattern.replace(/\\/g, '/')).replace(/\/$/, ''));
  }
  return [...roots];
}

/**
 * Discover directory symlinks under the given scan roots (without descending
 * into the symlink targets). Used only when native `followSymlinks` is unavailable.
 */
async function findDirectorySymlinkRoots(cwd: string, scanRoots: string[]): Promise<string[]> {
  const roots: string[] = [];

  async function walk(rel: string, depth: number): Promise<void> {
    if (depth > MAX_SYMLINK_WALK_DEPTH) {
      return;
    }
    const abs = rel ? join(cwd, rel) : cwd;
    let entries: Dirent[];
    try {
      entries = (await readdir(abs, { withFileTypes: true })) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        try {
          if ((await stat(join(cwd, childRel))).isDirectory()) {
            roots.push(childRel.replace(/\\/g, '/'));
          }
        } catch {
          // dangling link
        }
        continue;
      }
      if (entry.isDirectory()) {
        await walk(childRel, depth + 1);
      }
    }
  }

  for (const scanRoot of scanRoots) {
    await walk(scanRoot, 0);
  }
  return roots;
}

function findDirectorySymlinkRootsSync(cwd: string, scanRoots: string[]): string[] {
  const roots: string[] = [];

  function walk(rel: string, depth: number): void {
    if (depth > MAX_SYMLINK_WALK_DEPTH) {
      return;
    }
    const abs = rel ? join(cwd, rel) : cwd;
    let entries: Dirent[];
    try {
      entries = readdirSync(abs, { withFileTypes: true }) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        try {
          if (statSync(join(cwd, childRel)).isDirectory()) {
            roots.push(childRel.replace(/\\/g, '/'));
          }
        } catch {
          // dangling link
        }
        continue;
      }
      if (entry.isDirectory()) {
        walk(childRel, depth + 1);
      }
    }
  }

  for (const scanRoot of scanRoots) {
    walk(scanRoot, 0);
  }
  return roots;
}

/** Extra patterns so recursive globs can enter directory symlinks on older Node. */
function patternsWithSymlinkRoots(pattern: string, symlinkRoots: string[]): string[] {
  if (!pattern.includes('**') || symlinkRoots.length === 0) {
    return [pattern];
  }
  const unixPattern = pattern.replace(/\\/g, '/');
  const prefix = literalDirPrefix(unixPattern);
  const rest = unixPattern.slice(prefix.length);
  const extras = symlinkRoots
    .filter(root => {
      if (!prefix) {
        return true;
      }
      // Only re-root symlinks that live under the pattern's static prefix
      // (e.g. `src/vendor` for `src/**/*.graphql`), not unrelated cwd roots.
      return root === prefix.slice(0, -1) || root.startsWith(prefix);
    })
    .map(root => `${root}/${rest}`);
  return [unixPattern, ...extras];
}

type GlobOptions = {
  cwd: string;
  exclude?: string[];
  withFileTypes: boolean;
  followSymlinks?: boolean;
};

async function collectGlobMatches(
  pattern: string,
  options: GlobOptions,
  onlyFiles: boolean,
): Promise<string[]> {
  const paths: string[] = [];
  const iterator = globAsync(pattern, options);
  for await (const file of iterator) {
    const entry = file as string | Dirent;
    if (onlyFiles && !(await isFileLike(entry))) {
      continue;
    }
    paths.push(toPath(entry));
  }
  return paths;
}

function collectGlobMatchesSync(
  pattern: string,
  options: GlobOptions,
  onlyFiles: boolean,
): string[] {
  const paths: string[] = [];
  for (const file of globSync(pattern, options) as Array<string | Dirent>) {
    if (onlyFiles && !isFileLikeSync(file)) {
      continue;
    }
    paths.push(toPath(file));
  }
  return paths;
}

function buildGlobOptions(
  cwd: string,
  exclude: string[],
  onlyFiles: boolean,
  followSymlinks: boolean,
): GlobOptions {
  return {
    cwd,
    exclude: exclude.length > 0 ? exclude : undefined,
    withFileTypes: onlyFiles,
    ...(followSymlinks ? { followSymlinks: true } : {}),
  };
}

/**
 * File matching helper backed by Node's built-in `fs.glob` (Node >=22.18).
 * Replaces the previous `globby` dependency for loader / load-files use cases.
 */
export async function matchFiles(
  patterns: string | string[],
  options: MatchFilesOptions = {},
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const absolute = options.absolute !== false;
  const onlyFiles = options.onlyFiles !== false;
  const { include, ignore: negated } = splitPatterns(patterns);
  const exclude = [...negated, ...asArray(options.ignore ?? []).map(normalizeIgnore)];
  const expandedIncludes = await Promise.all(include.map(pattern => expandPattern(pattern, cwd)));
  const scanRoots = symlinkScanRoots(expandedIncludes);
  const followSymlinks = SUPPORTS_GLOB_FOLLOW_SYMLINKS && scanRoots.length > 0;
  const globOptions = buildGlobOptions(cwd, exclude, onlyFiles, followSymlinks);
  const symlinkRoots =
    followSymlinks || scanRoots.length === 0 ? [] : await findDirectorySymlinkRoots(cwd, scanRoots);
  const paths: string[] = [];
  for (const expanded of expandedIncludes) {
    for (const globPattern of patternsWithSymlinkRoots(expanded, symlinkRoots)) {
      paths.push(...(await collectGlobMatches(globPattern, globOptions, onlyFiles)));
    }
  }
  return finalizePaths(paths, cwd, absolute);
}

export function matchFilesSync(
  patterns: string | string[],
  options: MatchFilesOptions = {},
): string[] {
  const cwd = options.cwd ?? process.cwd();
  const absolute = options.absolute !== false;
  const onlyFiles = options.onlyFiles !== false;
  const { include, ignore: negated } = splitPatterns(patterns);
  const exclude = [...negated, ...asArray(options.ignore ?? []).map(normalizeIgnore)];
  const expandedIncludes = include.map(pattern => expandPatternSync(pattern, cwd));
  const scanRoots = symlinkScanRoots(expandedIncludes);
  const followSymlinks = SUPPORTS_GLOB_FOLLOW_SYMLINKS && scanRoots.length > 0;
  const globOptions = buildGlobOptions(cwd, exclude, onlyFiles, followSymlinks);
  const symlinkRoots =
    followSymlinks || scanRoots.length === 0 ? [] : findDirectorySymlinkRootsSync(cwd, scanRoots);
  const paths: string[] = [];
  for (const expanded of expandedIncludes) {
    for (const globPattern of patternsWithSymlinkRoots(expanded, symlinkRoots)) {
      paths.push(...collectGlobMatchesSync(globPattern, globOptions, onlyFiles));
    }
  }
  return finalizePaths(paths, cwd, absolute);
}
