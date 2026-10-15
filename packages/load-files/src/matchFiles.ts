import { Dirent, globSync, readdirSync, statSync } from 'node:fs';
import { glob as globAsync, readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

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

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

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

function finalizePaths(paths: string[], cwd: string, absolute: boolean): string[] {
  const converted = absolute
    ? paths.map(m => (isAbsolute(m) ? m : resolve(cwd, m)))
    : paths.map(m => (isAbsolute(m) ? relative(cwd, m) : m));
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

/**
 * Node's `fs.glob` only follows directory symlinks when `followSymlinks` is set
 * (Node >=26.1). Until then, discover symlink directories under `cwd` (without
 * descending into them) so recursive glob patterns can be re-rooted explicitly.
 */
async function findDirectorySymlinkRoots(cwd: string): Promise<string[]> {
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

  await walk('', 0);
  return roots;
}

function findDirectorySymlinkRootsSync(cwd: string): string[] {
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

  walk('', 0);
  return roots;
}

/** Extra patterns so recursive globs can enter directory symlinks on Node <26.1. */
function patternsWithSymlinkRoots(pattern: string, symlinkRoots: string[]): string[] {
  if (!pattern.includes('**') || symlinkRoots.length === 0) {
    return [pattern];
  }
  const unixPattern = pattern.replace(/\\/g, '/');
  const extras = symlinkRoots.map(root => `${root}/${unixPattern}`);
  return [unixPattern, ...extras];
}

type GlobOptions = {
  cwd: string;
  exclude?: string[];
  withFileTypes: boolean;
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

/**
 * File matching helper backed by Node's built-in `fs.glob` (Node >=22.14).
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
  const exclude = [...negated, ...asArray(options.ignore).map(normalizeIgnore)];
  const globOptions: GlobOptions = {
    cwd,
    exclude: exclude.length > 0 ? exclude : undefined,
    withFileTypes: onlyFiles,
  };
  const symlinkRoots = await findDirectorySymlinkRoots(cwd);
  const paths: string[] = [];
  for (const pattern of include) {
    const expanded = await expandPattern(pattern, cwd);
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
  const exclude = [...negated, ...asArray(options.ignore).map(normalizeIgnore)];
  const globOptions: GlobOptions = {
    cwd,
    exclude: exclude.length > 0 ? exclude : undefined,
    withFileTypes: onlyFiles,
  };
  const symlinkRoots = findDirectorySymlinkRootsSync(cwd);
  const paths: string[] = [];
  for (const pattern of include) {
    const expanded = expandPatternSync(pattern, cwd);
    for (const globPattern of patternsWithSymlinkRoots(expanded, symlinkRoots)) {
      paths.push(...collectGlobMatchesSync(globPattern, globOptions, onlyFiles));
    }
  }
  return finalizePaths(paths, cwd, absolute);
}
