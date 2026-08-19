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

export async function getCustomLoaderByPath(path: string, cwd: string) {
  const requireFn = createLoaderRequire(cwd);
  try {
    const loader = extractLoaderFromModule(requireFn(path));
    if (typeof loader === 'function') {
      return loader;
    }
  } catch {
    // createRequire cannot load ESM; fall through to import().
  }

  try {
    const href = resolveLoaderModuleUrl(path, cwd, requireFn);
    const importedModule = await import(href);
    return extractLoaderFromModule(importedModule);
  } catch {
    return null;
  }
}

function getCustomLoaderByPathSync(path: string, cwd: string) {
  try {
    return extractLoaderFromModule(createLoaderRequire(cwd)(path)) ?? null;
  } catch {
    return null;
  }
}

export async function useCustomLoader(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = await getCustomLoaderByPath(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}

export function useCustomLoaderSync(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = getCustomLoaderByPathSync(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}
