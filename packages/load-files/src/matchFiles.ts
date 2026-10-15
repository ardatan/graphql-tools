import { Dirent, globSync, statSync } from 'node:fs';
import { glob as globAsync, stat } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

export interface MatchFilesOptions {
  cwd?: string;
  absolute?: boolean;
  ignore?: string | string[];
  onlyFiles?: boolean;
  [key: string]: unknown;
}

const GLOB_MAGIC = /[*?[{\\]/;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeIgnore(ignore: string): string {
  return ignore.startsWith('!') ? ignore.slice(1) : ignore;
}

function splitPatterns(patterns: string | string[]): {
  include: string[];
  ignore: string[];
} {
  const include: string[] = [];
  const ignore: string[] = [];
  for (const pattern of asArray(patterns)) {
    if (pattern.startsWith('!')) {
      ignore.push(normalizeIgnore(pattern));
    } else {
      include.push(pattern);
    }
  }
  return { include, ignore };
}

/**
 * Convert a few globby/minimatch shorthands that Node's fs.glob does not accept
 * (e.g. `(a|b)` → `{a,b}`) while leaving extglobs like `+(...)` / `!(...)` alone.
 */
function normalizeIncludePattern(pattern: string): string {
  // Rewrite a trailing bare `(a|b|c)` alternation only when it is not an extglob
  // (`*(...)`, `?(...)`, `+(...)`, `@(...)`, `!(...)`).
  return pattern.replace(
    /(?<![?*+@!])\(([^()/]+(?:\|[^()/]+)+)\)$/g,
    (_match, group: string) => `{${group.replace(/\|/g, ',')}}`,
  );
}

function pathFromDirent(entry: Dirent): string {
  const parent = entry.parentPath || (entry as Dirent & { path?: string }).path || '';
  return join(parent, entry.name);
}

function finalize(
  entries: Array<string | Dirent>,
  cwd: string,
  absolute: boolean,
  onlyFiles: boolean,
): string[] {
  const paths: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') {
      if (onlyFiles && !entry.isFile()) {
        continue;
      }
      paths.push(pathFromDirent(entry));
      continue;
    }
    if (onlyFiles && entry.replace(/\\/g, '/').endsWith('/')) {
      continue;
    }
    paths.push(entry);
  }

  const unique = [...new Set(paths)];
  if (!absolute) {
    return unique;
  }
  return unique.map(m => (isAbsolute(m) ? m : resolve(cwd, m)));
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
 * File matching helper backed by Node's built-in `fs.glob` (Node 22+).
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
  const matches: Array<string | Dirent> = [];
  for (const pattern of include) {
    const expanded = await expandPattern(pattern, cwd);
    const iterator = globAsync(expanded, {
      cwd,
      exclude: exclude.length > 0 ? exclude : undefined,
      withFileTypes: onlyFiles,
    });
    for await (const file of iterator) {
      matches.push(file as string | Dirent);
    }
  }
  return finalize(matches, cwd, absolute, onlyFiles);
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
  const matches: Array<string | Dirent> = [];
  for (const pattern of include) {
    const expanded = expandPatternSync(pattern, cwd);
    matches.push(
      ...(globSync(expanded, {
        cwd,
        exclude: exclude.length > 0 ? exclude : undefined,
        withFileTypes: onlyFiles,
      }) as Array<string | Dirent>),
    );
  }
  return finalize(matches, cwd, absolute, onlyFiles);
}
