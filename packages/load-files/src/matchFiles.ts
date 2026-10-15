import { Dirent, globSync, statSync } from 'node:fs';
import { glob as globAsync, stat } from 'node:fs/promises';
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
  const unique = [...new Set(paths)];
  if (absolute) {
    return unique.map(m => (isAbsolute(m) ? m : resolve(cwd, m)));
  }
  return unique.map(m => (isAbsolute(m) ? relative(cwd, m) : m));
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
  const paths: string[] = [];
  for (const pattern of include) {
    const expanded = await expandPattern(pattern, cwd);
    const iterator = globAsync(expanded, {
      cwd,
      exclude: exclude.length > 0 ? exclude : undefined,
      withFileTypes: onlyFiles,
    });
    for await (const file of iterator) {
      const entry = file as string | Dirent;
      if (onlyFiles && !(await isFileLike(entry))) {
        continue;
      }
      paths.push(toPath(entry));
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
  const paths: string[] = [];
  for (const pattern of include) {
    const expanded = expandPatternSync(pattern, cwd);
    for (const file of globSync(expanded, {
      cwd,
      exclude: exclude.length > 0 ? exclude : undefined,
      withFileTypes: onlyFiles,
    }) as Array<string | Dirent>) {
      if (onlyFiles && !isFileLikeSync(file)) {
        continue;
      }
      paths.push(toPath(file));
    }
  }
  return finalizePaths(paths, cwd, absolute);
}
