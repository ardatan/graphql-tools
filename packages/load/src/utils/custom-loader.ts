import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, isAbsolute, join as joinPaths } from 'path';
import { pathToFileURL } from 'url';

function extractLoaderFromModule(loaderModule: any) {
  if (loaderModule == null) {
    return undefined;
  }
  if (typeof loaderModule.default === 'function') {
    return loaderModule.default;
  }
  if (typeof loaderModule === 'function') {
    return loaderModule;
  }
}

function createLoaderRequire(cwd: string) {
  return createRequire(joinPaths(cwd, 'noop.js'));
}

function isBarePackageSpecifier(specifier: string): boolean {
  return !isAbsolute(specifier) && !specifier.startsWith('.') && !specifier.startsWith('file:');
}

function findPackageDir(packageName: string, cwd: string): string | undefined {
  let dir = cwd;
  while (true) {
    const candidate = joinPaths(dir, 'node_modules', ...packageName.split('/'));
    if (existsSync(joinPaths(candidate, 'package.json'))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function stringFromConditionalExport(entry: unknown): string | undefined {
  if (typeof entry === 'string') {
    return entry;
  }
  if (entry == null || typeof entry !== 'object') {
    return undefined;
  }
  const record = entry as Record<string, unknown>;
  const importEntry = record['import'];
  if (typeof importEntry === 'string') {
    return importEntry;
  }
  if (importEntry != null && typeof importEntry === 'object') {
    const nested = (importEntry as Record<string, unknown>)['default'];
    if (typeof nested === 'string') {
      return nested;
    }
  }
  const defaultEntry = record['default'];
  if (typeof defaultEntry === 'string') {
    return defaultEntry;
  }
  return undefined;
}

function packageImportEntry(exportsField: unknown): string | undefined {
  if (typeof exportsField === 'string') {
    return exportsField;
  }
  if (exportsField == null || typeof exportsField !== 'object') {
    return undefined;
  }
  const record = exportsField as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, '.')) {
    return stringFromConditionalExport(record['.']);
  }
  return stringFromConditionalExport(record);
}

function resolvePackageImportPath(packageDir: string): string | undefined {
  const pkg = JSON.parse(readFileSync(joinPaths(packageDir, 'package.json'), 'utf8')) as {
    exports?: unknown;
    module?: string;
    main?: string;
  };
  const entry = packageImportEntry(pkg.exports) ?? pkg.module ?? pkg.main;
  if (entry == null) {
    return undefined;
  }
  return joinPaths(packageDir, entry);
}

export function resolveLoaderModuleUrl(path: string, cwd: string, requireFn: NodeRequire): string {
  try {
    return pathToFileURL(requireFn.resolve(path)).href;
  } catch {
    if (isBarePackageSpecifier(path)) {
      const packageDir = findPackageDir(path, cwd);
      const entry = packageDir != null ? resolvePackageImportPath(packageDir) : undefined;
      if (entry != null) {
        return pathToFileURL(entry).href;
      }
    }
    const absolutePath = isAbsolute(path) ? path : joinPaths(cwd, path);
    return pathToFileURL(absolutePath).href;
  }
}

type CustomLoaderFn = (...args: any[]) => any;
type CustomLoaderResult = { loader: CustomLoaderFn } | { error: Error };

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function missingFunctionExportError(path: string): Error {
  return new Error(`custom loader module did not export a function: ${path}`);
}

function combineLoadErrors(first: Error | undefined, second: Error): Error {
  if (first != null && first.message !== second.message) {
    return new Error(`${first}\n${second}`);
  }
  return first ?? second;
}

function failedToLoadCustomLoader(loaderPointer: unknown, error: Error): Error {
  return new Error(`Failed to load custom loader: ${loaderPointer}\n${error}`);
}

async function loadCustomLoaderByPath(path: string, cwd: string): Promise<CustomLoaderResult> {
  const requireFn = createLoaderRequire(cwd);
  let requireError: Error | undefined;
  try {
    const loader = extractLoaderFromModule(requireFn(path));
    if (typeof loader === 'function') {
      return { loader };
    }
  } catch (error) {
    // createRequire cannot load ESM; fall through to import().
    requireError = toError(error);
  }

  try {
    const href = resolveLoaderModuleUrl(path, cwd, requireFn);
    const importedModule = await import(href);
    const loader = extractLoaderFromModule(importedModule);
    if (typeof loader === 'function') {
      return { loader };
    }
    return { error: missingFunctionExportError(path) };
  } catch (error) {
    return { error: combineLoadErrors(requireError, toError(error)) };
  }
}

function loadCustomLoaderByPathSync(path: string, cwd: string): CustomLoaderResult {
  try {
    const loader = extractLoaderFromModule(createLoaderRequire(cwd)(path));
    if (typeof loader === 'function') {
      return { loader };
    }
    return { error: missingFunctionExportError(path) };
  } catch (error) {
    return { error: toError(error) };
  }
}

export async function getCustomLoaderByPath(
  path: string,
  cwd: string,
): Promise<CustomLoaderFn | null> {
  const result = await loadCustomLoaderByPath(path, cwd);
  return 'loader' in result ? result.loader : null;
}

export async function useCustomLoader(loaderPointer: any, cwd: string) {
  if (typeof loaderPointer === 'function') {
    return loaderPointer;
  }

  if (typeof loaderPointer === 'string') {
    const result = await loadCustomLoaderByPath(loaderPointer, cwd);
    if ('loader' in result) {
      return result.loader;
    }
    throw failedToLoadCustomLoader(loaderPointer, result.error);
  }

  throw new Error(`Failed to load custom loader: ${loaderPointer}`);
}

export function useCustomLoaderSync(loaderPointer: any, cwd: string) {
  if (typeof loaderPointer === 'function') {
    return loaderPointer;
  }

  if (typeof loaderPointer === 'string') {
    const result = loadCustomLoaderByPathSync(loaderPointer, cwd);
    if ('loader' in result) {
      return result.loader;
    }
    throw failedToLoadCustomLoader(loaderPointer, result.error);
  }

  throw new Error(`Failed to load custom loader: ${loaderPointer}`);
}
